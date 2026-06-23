import type { ArchitectureEdge, ArchitectureNode } from "@/types";

export interface AdjacencyMaps {
  /** node id -> outgoing edges */
  out: Map<string, ArchitectureEdge[]>;
  /** node id -> incoming edges */
  in: Map<string, ArchitectureEdge[]>;
  nodeById: Map<string, ArchitectureNode>;
}

export function buildAdjacency(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
): AdjacencyMaps {
  const out = new Map<string, ArchitectureEdge[]>();
  const inc = new Map<string, ArchitectureEdge[]>();
  const nodeById = new Map<string, ArchitectureNode>();

  for (const n of nodes) {
    out.set(n.id, []);
    inc.set(n.id, []);
    nodeById.set(n.id, n);
  }
  for (const e of edges) {
    if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue;
    out.get(e.source)!.push(e);
    inc.get(e.target)!.push(e);
  }
  return { out, in: inc, nodeById };
}

/** Nodes that originate traffic (clients). */
export function findEntryNodes(nodes: ArchitectureNode[]): ArchitectureNode[] {
  const clients = nodes.filter((n) => isClient(n));
  if (clients.length > 0) return clients;
  // Fallback: nodes with no inbound edges are treated as entries.
  return nodes;
}

export function isClient(node: ArchitectureNode): boolean {
  return node.data.category === "client";
}

export function isPersistence(node: ArchitectureNode): boolean {
  return (
    node.data.category === "database" ||
    node.data.category === "storage" ||
    node.data.componentType === "vector-database"
  );
}

/**
 * Enumerate forward request paths from entry nodes. Paths terminate at a node
 * with no outgoing edges or at a persistence node. Cycles are broken by the
 * visited set. Bounded by `maxPaths` to avoid combinatorial explosion.
 */
export function enumeratePaths(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  maxPaths = 400,
): { nodeIds: string[]; edgeIds: string[] }[] {
  const { out, nodeById } = buildAdjacency(nodes, edges);
  const entries = findEntryNodes(nodes);
  const paths: { nodeIds: string[]; edgeIds: string[] }[] = [];

  const walk = (
    nodeId: string,
    nodeAcc: string[],
    edgeAcc: string[],
    visited: Set<string>,
  ) => {
    if (paths.length >= maxPaths) return;
    const node = nodeById.get(nodeId);
    if (!node) return;

    const outgoing = (out.get(nodeId) ?? []).filter((e) => {
      const target = nodeById.get(e.target);
      return target && !visited.has(e.target);
    });

    // Terminal: no further hops, or reached persistence.
    const terminal =
      outgoing.length === 0 || (isPersistence(node) && nodeAcc.length > 1);

    if (terminal) {
      paths.push({ nodeIds: [...nodeAcc], edgeIds: [...edgeAcc] });
      return;
    }

    for (const e of outgoing) {
      visited.add(e.target);
      walk(e.target, [...nodeAcc, e.target], [...edgeAcc, e.id], visited);
      visited.delete(e.target);
      if (paths.length >= maxPaths) return;
    }
  };

  for (const entry of entries) {
    walk(entry.id, [entry.id], [], new Set([entry.id]));
  }
  return paths;
}

/** Detect directed cycles; returns the node-id ring for each cycle found. */
export function detectCycles(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
): string[][] {
  const { out } = buildAdjacency(nodes, edges);
  const cycles: string[][] = [];
  const color = new Map<string, 0 | 1 | 2>(); // 0=white,1=gray,2=black
  const stack: string[] = [];

  const dfs = (id: string) => {
    color.set(id, 1);
    stack.push(id);
    for (const e of out.get(id) ?? []) {
      const next = e.target;
      const c = color.get(next) ?? 0;
      if (c === 0) {
        dfs(next);
      } else if (c === 1) {
        // back edge -> cycle from `next` to top of stack
        const idx = stack.indexOf(next);
        if (idx >= 0) cycles.push(stack.slice(idx));
      }
    }
    stack.pop();
    color.set(id, 2);
  };

  for (const n of nodes) {
    if ((color.get(n.id) ?? 0) === 0) dfs(n.id);
  }
  return dedupeCycles(cycles);
}

function dedupeCycles(cycles: string[][]): string[][] {
  const seen = new Set<string>();
  const result: string[][] = [];
  for (const cycle of cycles) {
    const key = [...cycle].sort().join("|");
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cycle);
    }
  }
  return result;
}

/** Set of node ids reachable (forward) from any entry node. */
export function reachableFromEntries(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
): Set<string> {
  const { out } = buildAdjacency(nodes, edges);
  const entries = findEntryNodes(nodes);
  const seen = new Set<string>();
  const queue = entries.map((n) => n.id);
  for (const id of queue) seen.add(id);
  while (queue.length) {
    const id = queue.shift()!;
    for (const e of out.get(id) ?? []) {
      if (!seen.has(e.target)) {
        seen.add(e.target);
        queue.push(e.target);
      }
    }
  }
  return seen;
}
