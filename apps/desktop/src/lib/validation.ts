import type {
  ArchitectureEdge,
  ArchitectureNode,
  SimulationResult,
  ValidationIssue,
} from "@/types";
import { getComponentSpec } from "@/data/components";
import {
  buildAdjacency,
  detectCycles,
  isClient,
  isPersistence,
  reachableFromEntries,
} from "./graph";

function spec(node: ArchitectureNode) {
  return getComponentSpec(node.data.componentType);
}

/**
 * Run every architecture lint from the design doc. If a `result` is supplied,
 * runtime checks (overloaded components) are included too.
 */
export function validateArchitecture(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  result?: SimulationResult,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (nodes.length === 0) {
    issues.push({
      id: "empty-canvas",
      kind: "empty-canvas",
      severity: "info",
      title: "Empty canvas",
      message: "Drag components from the library to start designing.",
      nodeIds: [],
      edgeIds: [],
    });
    return issues;
  }

  const { nodeById } = buildAdjacency(nodes, edges);

  // 1. Database / persistence exposed directly to a client.
  for (const e of edges) {
    const a = nodeById.get(e.source);
    const b = nodeById.get(e.target);
    if (!a || !b) continue;
    const clientPersistencePair =
      (isClient(a) && isPersistence(b)) || (isClient(b) && isPersistence(a));
    if (clientPersistencePair) {
      issues.push({
        id: `db-exposed-${e.id}`,
        kind: "db-exposed-to-client",
        severity: "error",
        title: "Database exposed to client",
        message: `${a.data.label} is connected directly to ${b.data.label}. Never expose a datastore directly to clients — front it with an API/service layer.`,
        nodeIds: [a.id, b.id],
        edgeIds: [e.id],
      });
    }
  }

  // 2. Circular dependencies.
  for (const cycle of detectCycles(nodes, edges)) {
    const labels = cycle.map((id) => nodeById.get(id)?.data.label ?? id);
    issues.push({
      id: `cycle-${cycle.join("-")}`,
      kind: "circular-dependency",
      severity: "warning",
      title: "Circular dependency",
      message: `Cycle detected: ${labels.join(" -> ")} -> ${labels[0]}. Circular service dependencies cause cascading failures and deploy ordering problems.`,
      nodeIds: cycle,
      edgeIds: [],
    });
  }

  // 3. Unreachable nodes (not reachable from any entry, and not a client).
  const reachable = reachableFromEntries(nodes, edges);
  for (const n of nodes) {
    if (isClient(n)) continue;
    const isolated = (
      edges.every((e) => e.source !== n.id && e.target !== n.id)
    );
    if (!reachable.has(n.id) || isolated) {
      issues.push({
        id: `unreachable-${n.id}`,
        kind: "unreachable-node",
        severity: isolated ? "warning" : "info",
        title: "Unreachable component",
        message: `${n.data.label} is not reachable from any client entry point. It will never receive traffic.`,
        nodeIds: [n.id],
        edgeIds: [],
      });
    }
  }

  // 4. Single points of failure (critical stateful/auth nodes without redundancy).
  for (const n of nodes) {
    const critical = isPersistence(n) || n.data.componentType === "auth-service";
    const hasTraffic = edges.some((e) => e.target === n.id || e.source === n.id);
    if (critical && hasTraffic && n.data.metrics.replicas <= 1) {
      issues.push({
        id: `spof-${n.id}`,
        kind: "single-point-of-failure",
        severity: "warning",
        title: "Single point of failure",
        message: `${n.data.label} runs a single instance. Add replicas (and a standby/failover) to avoid an outage if it dies.`,
        nodeIds: [n.id],
        edgeIds: [],
      });
    }
  }

  // 5. Missing persistence.
  const hasCompute = nodes.some((n) => n.data.category === "compute");
  const hasPersistence = nodes.some(isPersistence);
  if (hasCompute && !hasPersistence) {
    issues.push({
      id: "missing-persistence",
      kind: "missing-persistence",
      severity: "warning",
      title: "No persistence layer",
      message:
        "You have compute services but no database or storage. Where does state live? Add a datastore.",
      nodeIds: [],
      edgeIds: [],
    });
  }

  // 6. Dead queues (a broker with no consumer downstream).
  for (const n of nodes) {
    if (!spec(n)?.capabilities.isQueue) continue;
    const outgoing = edges.filter((e) => e.source === n.id);
    const incoming = edges.filter((e) => e.target === n.id);
    const hasConsumer = outgoing.some((e) => {
      const t = nodeById.get(e.target);
      return t && spec(t)?.capabilities.isConsumer;
    });
    if (incoming.length > 0 && !hasConsumer) {
      issues.push({
        id: `dead-queue-${n.id}`,
        kind: "dead-queue",
        severity: "warning",
        title: "Dead queue",
        message: `${n.data.label} has producers but no consumer. Messages will pile up forever — connect a worker/service to drain it.`,
        nodeIds: [n.id],
        edgeIds: [],
      });
    }
  }

  // 7. Region failure risk (everything in one region).
  const regions = new Set(nodes.map((n) => n.data.region || "us-east-1"));
  if (regions.size === 1 && hasPersistence && nodes.length >= 4) {
    issues.push({
      id: "region-failure-risk",
      kind: "region-failure-risk",
      severity: "info",
      title: "Single-region deployment",
      message: `All components are in "${[...regions][0]}". A region outage takes the whole system down. Consider multi-region redundancy.`,
      nodeIds: [],
      edgeIds: [],
    });
  }

  // 8. Overloaded components (runtime, only with a simulation result).
  if (result) {
    for (const [id, runtime] of Object.entries(result.perNode)) {
      if (runtime.status === "overloaded") {
        const n = nodeById.get(id);
        issues.push({
          id: `overloaded-${id}`,
          kind: "overloaded-component",
          severity: "error",
          title: "Overloaded component",
          message: `${n?.data.label ?? id} is at ${Math.round(
            runtime.utilization * 100,
          )}% capacity. It is dropping requests — scale it up or add replicas.`,
          nodeIds: [id],
          edgeIds: [],
        });
      }
    }
  }

  return issues;
}
