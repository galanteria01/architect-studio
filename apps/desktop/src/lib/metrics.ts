import type {
  ArchitectureEdge,
  ArchitectureNode,
  NodeStatus,
  RequestPath,
  SimulationParams,
  SimulationResult,
} from "@/types";
import {
  buildAdjacency,
  enumeratePaths,
  findEntryNodes,
  isPersistence,
} from "./graph";

export const DEFAULT_SIM_PARAMS: SimulationParams = {
  rps: 1000,
  readRatio: 0.8,
  cascadeFailures: true,
};

/** Effective per-node capacity accounting for replicas and failure injection. */
function effectiveCapacity(node: ArchitectureNode): number {
  if (node.data.disabled) return 0;
  const { capacityRps, replicas } = node.data.metrics;
  return capacityRps * Math.max(1, replicas);
}

/** Redundancy-aware availability: 1 - (1 - a)^replicas. Disabled => 0. */
function nodeAvailability(node: ArchitectureNode): number {
  if (node.data.disabled) return 0;
  const { availability, replicas } = node.data.metrics;
  const r = Math.max(1, replicas);
  return 1 - Math.pow(1 - availability, r);
}

/** Identify back-edges (edges that close a directed cycle) to keep flow a DAG. */
function findBackEdges(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
): Set<string> {
  const { out } = buildAdjacency(nodes, edges);
  const color = new Map<string, 0 | 1 | 2>();
  const back = new Set<string>();
  const dfs = (id: string) => {
    color.set(id, 1);
    for (const e of out.get(id) ?? []) {
      const c = color.get(e.target) ?? 0;
      if (c === 0) dfs(e.target);
      else if (c === 1) back.add(e.id);
    }
    color.set(id, 2);
  };
  for (const n of nodes) if ((color.get(n.id) ?? 0) === 0) dfs(n.id);
  return back;
}

/** Propagate offered load forward through the DAG, returning inbound rps/node. */
function computeFlow(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  offeredPerEntry: number,
): Map<string, number> {
  const back = findBackEdges(nodes, edges);
  const dagEdges = edges.filter((e) => !back.has(e.id));
  const { out } = buildAdjacency(nodes, dagEdges);
  const indeg = new Map<string, number>();
  for (const n of nodes) indeg.set(n.id, 0);
  for (const e of dagEdges) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);

  // Kahn topological order.
  const queue = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const order: string[] = [];
  const localIndeg = new Map(indeg);
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const e of out.get(id) ?? []) {
      localIndeg.set(e.target, (localIndeg.get(e.target) ?? 0) - 1);
      if ((localIndeg.get(e.target) ?? 0) === 0) queue.push(e.target);
    }
  }

  const inbound = new Map<string, number>();
  for (const n of nodes) inbound.set(n.id, 0);
  const entryIds = new Set(findEntryNodes(nodes).map((n) => n.id));
  for (const id of entryIds) inbound.set(id, offeredPerEntry);

  for (const id of order) {
    const flow = inbound.get(id) ?? 0;
    const outgoing = out.get(id) ?? [];
    if (outgoing.length === 0 || flow <= 0) continue;
    const share = flow / outgoing.length;
    for (const e of outgoing) {
      inbound.set(e.target, (inbound.get(e.target) ?? 0) + share);
    }
  }
  return inbound;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

/**
 * Core deterministic simulation. Pure function: given a graph + params it
 * returns latency/throughput/availability/cost plus per-node runtime and a set
 * of traced request paths.
 */
export function simulate(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  params: SimulationParams = DEFAULT_SIM_PARAMS,
): SimulationResult {
  const timestamp = Date.now();
  const empty: SimulationResult = {
    meanLatencyMs: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    throughputRps: 0,
    availability: 0,
    monthlyCost: 0,
    errorRate: 0,
    bottlenecks: [],
    paths: [],
    perNode: {},
    timestamp,
  };
  if (nodes.length === 0) return empty;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edgeById = new Map(edges.map((e) => [e.id, e]));
  const entries = findEntryNodes(nodes);
  const offeredPerEntry = entries.length ? params.rps / entries.length : params.rps;

  // 1. Flow + per-node utilization.
  const inbound = computeFlow(nodes, edges, offeredPerEntry);
  const perNode: SimulationResult["perNode"] = {};
  let totalDropped = 0;
  const bottlenecks: { id: string; util: number }[] = [];

  for (const node of nodes) {
    const cap = effectiveCapacity(node);
    const inRps = inbound.get(node.id) ?? 0;
    const util = cap > 0 ? inRps / cap : inRps > 0 ? Infinity : 0;
    let status: NodeStatus = "idle";
    if (node.data.disabled) status = "down";
    else if (util > 1) status = "overloaded";
    else if (util > 0.75) status = "warning";
    else if (inRps > 0) status = "healthy";

    if (cap > 0 && inRps > cap) totalDropped += inRps - cap;
    if (util > 0.75 || status === "down") bottlenecks.push({ id: node.id, util });

    perNode[node.id] = {
      status,
      utilization: Number.isFinite(util) ? util : 1,
      inboundRps: inRps,
    };
  }

  // 2. Enumerate paths, compute latency with utilization-based inflation.
  const rawPaths = enumeratePaths(nodes, edges);
  const tracedPaths: RequestPath[] = [];
  const latencies: number[] = [];

  for (let i = 0; i < rawPaths.length; i++) {
    const { nodeIds, edgeIds } = rawPaths[i];
    let latency = 0;
    let ok = true;
    let failedAt: string | undefined;

    for (const nid of nodeIds) {
      const n = nodeById.get(nid);
      if (!n) continue;
      if (n.data.disabled) {
        ok = false;
        failedAt = nid;
        break;
      }
      const util = perNode[nid]?.utilization ?? 0;
      // Queueing penalty: latency grows as utilization approaches/exceeds 1.
      const inflation = util <= 0.7 ? 1 : 1 + (util - 0.7) * 2;
      latency += n.data.metrics.latencyMs * inflation;
      if (util > 1) {
        ok = false;
        failedAt = nid;
      }
    }
    for (const eid of edgeIds) {
      latency += edgeById.get(eid)?.data?.latencyMs ?? 0;
    }

    tracedPaths.push({
      id: `path-${i}`,
      nodeIds,
      edgeIds,
      totalLatencyMs: Math.round(latency),
      ok,
      failedAt,
    });
    if (ok) latencies.push(latency);
  }

  latencies.sort((a, b) => a - b);
  const meanLatencyMs = latencies.length
    ? latencies.reduce((s, v) => s + v, 0) / latencies.length
    : 0;

  // 3. Availability: SPOFs in series, parallel paths combined for redundancy.
  const availability = computeAvailability(rawPaths, nodeById);

  // 4. Throughput: load at which the first node saturates.
  let throughputRps = Infinity;
  for (const node of nodes) {
    const share = (inbound.get(node.id) ?? 0) / Math.max(params.rps, 1);
    if (share <= 0) continue;
    const cap = effectiveCapacity(node);
    if (cap <= 0) {
      throughputRps = 0;
      break;
    }
    throughputRps = Math.min(throughputRps, cap / share);
  }
  if (!Number.isFinite(throughputRps)) throughputRps = params.rps;

  // 5. Error rate combines overload drops and availability failures.
  const overloadFailRate = Math.min(1, totalDropped / Math.max(params.rps, 1));
  const errorRate = 1 - (1 - overloadFailRate) * availability;

  // 6. Cost = sum of replica costs (provisioned regardless of failure state).
  const monthlyCost = nodes.reduce(
    (sum, n) => sum + n.data.metrics.costMonthly * Math.max(1, n.data.metrics.replicas),
    0,
  );

  return {
    meanLatencyMs: Math.round(meanLatencyMs),
    p50: Math.round(percentile(latencies, 50)),
    p95: Math.round(percentile(latencies, 95)),
    p99: Math.round(percentile(latencies, 99)),
    throughputRps: Math.round(throughputRps),
    availability,
    monthlyCost: Math.round(monthlyCost),
    errorRate,
    bottlenecks: bottlenecks
      .sort((a, b) => b.util - a.util)
      .map((b) => b.id),
    paths: tracedPaths,
    perNode,
    timestamp,
  };
}

function computeAvailability(
  rawPaths: { nodeIds: string[] }[],
  nodeById: Map<string, ArchitectureNode>,
): number {
  if (rawPaths.length === 0) {
    // No request paths: availability is the product of persistence nodes (if any).
    const persistence = [...nodeById.values()].filter(isPersistence);
    if (persistence.length === 0) return 0;
    return persistence.reduce((p, n) => p * nodeAvailability(n), 1);
  }

  // SPOF nodes appear in every path -> in series, no path-level redundancy.
  const counts = new Map<string, number>();
  for (const p of rawPaths) {
    for (const id of new Set(p.nodeIds)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const spof = new Set(
    [...counts.entries()]
      .filter(([, c]) => c === rawPaths.length)
      .map(([id]) => id),
  );

  let criticalAvail = 1;
  for (const id of spof) {
    const n = nodeById.get(id);
    if (n) criticalAvail *= nodeAvailability(n);
  }

  // Remaining (non-SPOF) parts of each path act as redundant alternatives.
  let failAll = 1;
  for (const p of rawPaths) {
    let pathAvail = 1;
    for (const id of p.nodeIds) {
      if (spof.has(id)) continue;
      const n = nodeById.get(id);
      if (n) pathAvail *= nodeAvailability(n);
    }
    failAll *= 1 - pathAvail;
  }
  const redundantAvail = 1 - failAll;
  return criticalAvail * redundantAvail;
}
