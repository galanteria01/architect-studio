import { useCallback, useMemo, useRef, useState, type DragEvent, type MouseEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type EdgeTypes,
  type NodeTypes,
} from "@xyflow/react";
import { useShallow } from "zustand/react/shallow";
import { ArchitectureNodeView } from "@/components/nodes/ArchitectureNodeView";
import { AnimatedEdge } from "@/components/edges/AnimatedEdge";
import { useCanvasStore } from "@/store/canvas-store";
import { createArchitectureNode } from "@/lib/node-factory";
import { categoryStyle } from "@/lib/category-style";
import type { ArchitectureNode } from "@/types";
import { DRAG_MIME } from "@/components/sidebar/drag";
import { NodeContextMenu, type NodeMenuState } from "./NodeContextMenu";

const nodeTypes: NodeTypes = { architecture: ArchitectureNodeView };
const edgeTypes: EdgeTypes = { architecture: AnimatedEdge };

export function ArchitectureCanvas() {
  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<NodeMenuState | null>(null);
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
    selectEdge,
    setViewport,
  } = useCanvasStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      onNodesChange: s.onNodesChange,
      onEdgesChange: s.onEdgesChange,
      onConnect: s.onConnect,
      addNode: s.addNode,
      selectNode: s.selectNode,
      selectEdge: s.selectEdge,
      setViewport: s.setViewport,
    })),
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const componentType = event.dataTransfer.getData(DRAG_MIME);
      if (!componentType) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(createArchitectureNode(componentType, { x: position.x - 92, y: position.y - 24 }));
    },
    [addNode, screenToFlowPosition],
  );

  const onNodeContextMenu = useCallback(
    (event: MouseEvent, node: ArchitectureNode) => {
      event.preventDefault();
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      selectNode(node.id);
      setMenu({
        nodeId: node.id,
        // Clamp so the menu stays inside the canvas.
        left: Math.min(event.clientX - rect.left, rect.width - 190),
        top: Math.min(event.clientY - rect.top, rect.height - 200),
      });
    },
    [selectNode],
  );

  const closeMenu = useCallback(() => setMenu(null), []);

  const minimapColor = useMemo(
    () => (node: ArchitectureNode) => categoryStyle(node.data.category).color,
    [],
  );

  return (
    <div ref={wrapperRef} className="relative h-full w-full">
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onNodeClick={(_, node) => {
        selectNode(node.id);
        closeMenu();
      }}
      onNodeContextMenu={onNodeContextMenu}
      onEdgeClick={(_, edge) => selectEdge(edge.id)}
      onPaneClick={() => {
        selectNode(null);
        selectEdge(null);
        closeMenu();
      }}
      onMove={closeMenu}
      onMoveEnd={(_, viewport) => setViewport(viewport)}
      defaultEdgeOptions={{ type: "architecture" }}
      connectionLineStyle={{ stroke: "var(--color-primary)", strokeWidth: 2 }}
      proOptions={{ hideAttribution: true }}
      fitView
      minZoom={0.2}
      maxZoom={2}
      deleteKeyCode={["Backspace", "Delete"]}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} className="!bg-background" />
      <Controls className="!border-border !bg-card !shadow-sm [&_button]:!border-border [&_button]:!bg-card [&_button]:!text-foreground" />
      <MiniMap
        pannable
        zoomable
        nodeColor={minimapColor}
        nodeStrokeWidth={3}
        className="!bg-card/80 !border !border-border !rounded-lg"
        maskColor="color-mix(in oklab, var(--color-background) 70%, transparent)"
      />
    </ReactFlow>
      {menu && <NodeContextMenu menu={menu} onClose={closeMenu} />}
    </div>
  );
}
