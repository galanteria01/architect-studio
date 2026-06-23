import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import type { ArchitectureEdge } from "@/types";
import { useSimulationStore } from "@/store/simulation-store";
import { cn } from "@/lib/utils";

function AnimatedEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<ArchitectureEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const animate = useSimulationStore((s) => s.animate);
  const active = data?.active && animate;
  const protocol = data?.protocol ?? "HTTP";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: active ? 2.5 : 1.5,
          stroke: active
            ? "var(--color-primary)"
            : selected
              ? "var(--color-primary)"
              : "var(--color-muted-foreground)",
          opacity: active ? 1 : 0.55,
        }}
      />

      {active && (
        <>
          <circle r="4.5" fill="var(--color-primary)">
            <animateMotion dur="1.4s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="3" fill="var(--color-primary)" opacity="0.5">
            <animateMotion dur="1.4s" begin="0.45s" repeatCount="indefinite" path={edgePath} />
          </circle>
        </>
      )}

      {(selected || active) && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-md border bg-card/90 px-1.5 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur",
              active ? "text-primary" : "text-muted-foreground",
            )}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {protocol}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const AnimatedEdge = memo(AnimatedEdgeImpl);
