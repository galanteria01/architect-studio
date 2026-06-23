import type { Node } from "@xyflow/react";
import type { ComponentCategory, NodeMetrics } from "./component";

/** Runtime health a node can be in during/after a simulation. */
export type NodeStatus =
  | "idle"
  | "healthy"
  | "warning"
  | "overloaded"
  | "down";

/** Data payload stored on each React Flow node. */
export interface ArchitectureNodeData extends Record<string, unknown> {
  componentType: string;
  label: string;
  category: ComponentCategory;
  icon: string;
  metrics: NodeMetrics;
  config: Record<string, string | number | boolean>;
  /** Deployment region; used by multi-region + failure modelling. */
  region: string;
  /** Failure injection: a disabled node is treated as down. */
  disabled: boolean;
  /** Last computed runtime status (transient, from simulation). */
  status: NodeStatus;
  /** Last computed utilization as a fraction in [0, 1] (transient). */
  utilization: number;
  /** Inbound requests/sec assigned by the last simulation (transient). */
  inboundRps: number;
}

export type ArchitectureNode = Node<ArchitectureNodeData, "architecture">;
