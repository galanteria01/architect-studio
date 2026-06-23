import type { XYPosition } from "@xyflow/react";
import type { ArchitectureNode, ArchitectureNodeData } from "@/types";
import { getComponentSpec } from "@/data/components";
import { uid } from "./id";

export const DEFAULT_REGION = "us-east-1";

/** Build a fully-formed canvas node for a component type at a position. */
export function createArchitectureNode(
  componentType: string,
  position: XYPosition,
  overrides: Partial<ArchitectureNodeData> = {},
): ArchitectureNode {
  const spec = getComponentSpec(componentType);
  if (!spec) {
    throw new Error(`Unknown component type: ${componentType}`);
  }
  const data: ArchitectureNodeData = {
    componentType: spec.type,
    label: spec.label,
    category: spec.category,
    icon: spec.icon,
    metrics: { ...spec.defaults },
    config: {},
    region: DEFAULT_REGION,
    disabled: false,
    status: "idle",
    utilization: 0,
    inboundRps: 0,
    ...overrides,
  };
  return {
    id: uid("node"),
    type: "architecture",
    position,
    data,
  };
}
