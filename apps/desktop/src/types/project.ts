import type { Viewport } from "@xyflow/react";
import type { ArchitectureNode } from "./node";
import type { ArchitectureEdge } from "./edge";

/** Serializable representation of a canvas (nodes + edges + viewport). */
export interface ArchitectureGraph {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  viewport?: Viewport;
}

export interface Project {
  id?: number;
  uuid: string;
  name: string;
  description: string;
  graph: ArchitectureGraph;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSummary {
  id: number;
  uuid: string;
  name: string;
  description: string;
  updatedAt: number;
}

export interface Template {
  key: string;
  name: string;
  category: string;
  description: string;
  graph: ArchitectureGraph;
}
