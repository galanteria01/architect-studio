import { useMemo } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { useSimulationStore } from "@/store/simulation-store";
import { validateArchitecture } from "@/lib/validation";
import type { ValidationIssue } from "@/types";

export function useValidation(): {
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const revision = useCanvasStore((s) => s.revision);
  const result = useSimulationStore((s) => s.result);

  return useMemo(() => {
    const issues = validateArchitecture(nodes, edges, result ?? undefined);
    return {
      issues,
      errors: issues.filter((i) => i.severity === "error"),
      warnings: issues.filter((i) => i.severity === "warning"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, result]);
}
