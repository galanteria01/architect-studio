import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from "@xyflow/react";
import type {
  ArchitectureEdge,
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureNodeData,
  NodeMetrics,
} from "@/types";
import { uid } from "@/lib/id";

interface CanvasState {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  viewport: Viewport;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  /** Bumped whenever the topology meaningfully changes (drives re-simulation). */
  revision: number;

  onNodesChange: (changes: NodeChange<ArchitectureNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<ArchitectureEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  setViewport: (viewport: Viewport) => void;

  addNode: (node: ArchitectureNode) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  updateNodeData: (id: string, patch: Partial<ArchitectureNodeData>) => void;
  updateNodeMetrics: (id: string, patch: Partial<NodeMetrics>) => void;
  setNodeDisabled: (id: string, disabled: boolean) => void;
  renameNode: (id: string, label: string) => void;
  duplicateNode: (id: string) => void;
  deleteNode: (id: string) => void;
  deleteSelected: () => void;

  getGraph: () => ArchitectureGraph;
  setElements: (nodes: ArchitectureNode[], edges: ArchitectureEdge[]) => void;
  loadGraph: (graph: ArchitectureGraph) => void;
  clear: () => void;
  /** Apply transient runtime data (status/utilization) from a simulation. */
  applyRuntime: (
    perNode: Record<string, { status: ArchitectureNodeData["status"]; utilization: number; inboundRps: number }>,
    activeEdgeIds: string[],
  ) => void;
  resetRuntime: () => void;
}

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: DEFAULT_VIEWPORT,
  selectedNodeId: null,
  selectedEdgeId: null,
  revision: 0,

  onNodesChange: (changes) => {
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) }));
    if (changes.some((c) => c.type === "remove" || c.type === "add")) {
      set((s) => ({ revision: s.revision + 1 }));
    }
  },

  onEdgesChange: (changes) => {
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }));
    if (changes.some((c) => c.type === "remove" || c.type === "add")) {
      set((s) => ({ revision: s.revision + 1 }));
    }
  },

  onConnect: (connection) => {
    const edge: ArchitectureEdge = {
      id: uid("edge"),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
      type: "architecture",
      data: { latencyMs: 0, protocol: "HTTP", active: false },
    };
    set((s) => ({ edges: addEdge(edge, s.edges), revision: s.revision + 1 }));
  },

  setViewport: (viewport) => set({ viewport }),

  addNode: (node) =>
    set((s) => ({
      nodes: [...s.nodes, node],
      selectedNodeId: node.id,
      revision: s.revision + 1,
    })),

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  updateNodeData: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    })),

  updateNodeMetrics: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, metrics: { ...n.data.metrics, ...patch } } }
          : n,
      ),
      revision: s.revision + 1,
    })),

  setNodeDisabled: (id, disabled) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, disabled } } : n,
      ),
      revision: s.revision + 1,
    })),

  renameNode: (id, label) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label } } : n,
      ),
    })),

  duplicateNode: (id) => {
    const original = get().nodes.find((n) => n.id === id);
    if (!original) return;
    const clone: ArchitectureNode = {
      ...original,
      id: uid("node"),
      position: { x: original.position.x + 40, y: original.position.y + 40 },
      selected: false,
      data: { ...original.data, status: "idle", utilization: 0, inboundRps: 0 },
    };
    set((s) => ({
      nodes: [...s.nodes, clone],
      selectedNodeId: clone.id,
      revision: s.revision + 1,
    }));
  },

  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      revision: s.revision + 1,
    })),

  deleteSelected: () => {
    const { selectedNodeId, selectedEdgeId } = get();
    if (selectedNodeId) get().deleteNode(selectedNodeId);
    if (selectedEdgeId) {
      set((s) => ({
        edges: s.edges.filter((e) => e.id !== selectedEdgeId),
        selectedEdgeId: null,
        revision: s.revision + 1,
      }));
    }
  },

  getGraph: () => {
    const { nodes, edges, viewport } = get();
    return { nodes, edges, viewport };
  },

  setElements: (nodes, edges) =>
    set((s) => ({ nodes, edges, revision: s.revision + 1 })),

  loadGraph: (graph) =>
    set((s) => ({
      nodes: graph.nodes ?? [],
      edges: graph.edges ?? [],
      viewport: graph.viewport ?? DEFAULT_VIEWPORT,
      selectedNodeId: null,
      selectedEdgeId: null,
      revision: s.revision + 1,
    })),

  clear: () =>
    set((s) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      revision: s.revision + 1,
    })),

  applyRuntime: (perNode, activeEdgeIds) => {
    const active = new Set(activeEdgeIds);
    set((s) => ({
      nodes: s.nodes.map((n) => {
        const rt = perNode[n.id];
        if (!rt) return n;
        return {
          ...n,
          data: {
            ...n.data,
            status: rt.status,
            utilization: rt.utilization,
            inboundRps: rt.inboundRps,
          },
        };
      }),
      edges: s.edges.map((e) => ({
        ...e,
        data: { ...(e.data ?? { latencyMs: 0, protocol: "HTTP", active: false }), active: active.has(e.id) },
      })),
    }));
  },

  resetRuntime: () =>
    set((s) => ({
      nodes: s.nodes.map((n) => ({
        ...n,
        data: { ...n.data, status: "idle", utilization: 0, inboundRps: 0 },
      })),
      edges: s.edges.map((e) => ({
        ...e,
        data: { ...(e.data ?? { latencyMs: 0, protocol: "HTTP", active: false }), active: false },
      })),
    })),
}));
