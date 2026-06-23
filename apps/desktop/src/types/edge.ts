import type { Edge } from "@xyflow/react";

export interface ArchitectureEdgeData extends Record<string, unknown> {
  /** Optional network latency added by the link itself, in milliseconds. */
  latencyMs: number;
  /** Transport/protocol label shown on the edge (HTTP, gRPC, TCP, ...). */
  protocol: string;
  /** Whether this edge is currently carrying simulated traffic. */
  active: boolean;
}

export type ArchitectureEdge = Edge<ArchitectureEdgeData>;
