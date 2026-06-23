import type { ArchitectureEdge, ArchitectureGraph } from "@/types";
import { getComponentSpec } from "@/data/components";
import { createArchitectureNode } from "@/lib/node-factory";
import { uid } from "@/lib/id";
import { buildAdjacency, findEntryNodes } from "@/lib/graph";
import type { AIGraphSpec } from "./types";

/** ArchitectureGraph -> compact AI schema. */
export function toAIGraph(graph: ArchitectureGraph): AIGraphSpec {
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: n.data.componentType,
      label: n.data.label,
      region: n.data.region,
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
    })),
    edges: graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      protocol: e.data?.protocol ?? "HTTP",
    })),
  };
}

/**
 * AI schema -> ArchitectureGraph with auto-layout. Unknown component types are
 * skipped. When the AI omits coordinates we lay nodes out in BFS layers.
 */
export function fromAIGraph(spec: AIGraphSpec): ArchitectureGraph {
  const idMap = new Map<string, string>();
  const nodes = spec.nodes
    .filter((n) => getComponentSpec(n.type))
    .map((n) => {
      const node = createArchitectureNode(
        n.type,
        { x: n.x ?? 0, y: n.y ?? 0 },
        { label: n.label ?? undefined, region: n.region ?? undefined },
      );
      idMap.set(n.id, node.id);
      return node;
    });

  const edges: ArchitectureEdge[] = spec.edges
    .filter((e) => idMap.has(e.source) && idMap.has(e.target))
    .map((e) => ({
      id: uid("edge"),
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
      type: "architecture",
      data: { latencyMs: 0, protocol: e.protocol ?? "HTTP", active: false },
    }));

  const graph: ArchitectureGraph = { nodes, edges };
  const hasCoords = spec.nodes.some((n) => n.x != null && n.y != null);
  if (!hasCoords) autoLayout(graph);
  return graph;
}

/** Simple layered left-to-right layout based on BFS distance from entries. */
export function autoLayout(graph: ArchitectureGraph): void {
  const { out } = buildAdjacency(graph.nodes, graph.edges);
  const layer = new Map<string, number>();
  const entries = findEntryNodes(graph.nodes);
  const queue = entries.map((n) => n.id);
  for (const id of queue) layer.set(id, 0);

  while (queue.length) {
    const id = queue.shift()!;
    const l = layer.get(id) ?? 0;
    for (const e of out.get(id) ?? []) {
      if (!layer.has(e.target)) {
        layer.set(e.target, l + 1);
        queue.push(e.target);
      }
    }
  }

  let maxLayer = 0;
  for (const v of layer.values()) maxLayer = Math.max(maxLayer, v);
  const perLayerCount = new Map<number, number>();

  for (const node of graph.nodes) {
    const l = layer.get(node.id) ?? maxLayer + 1;
    const idx = perLayerCount.get(l) ?? 0;
    perLayerCount.set(l, idx + 1);
    node.position = { x: l * 280, y: idx * 130 };
  }
}
