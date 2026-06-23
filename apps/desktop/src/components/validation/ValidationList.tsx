import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useValidation } from "@/hooks/useValidation";
import { useCanvasStore } from "@/store/canvas-store";
import { cn } from "@/lib/utils";
import type { ValidationSeverity } from "@/types";

const ICON: Record<ValidationSeverity, typeof Info> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLOR: Record<ValidationSeverity, string> = {
  error: "text-red-500",
  warning: "text-amber-500",
  info: "text-sky-500",
};

export function ValidationList() {
  const { issues } = useValidation();
  const selectNode = useCanvasStore((s) => s.selectNode);

  if (issues.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <CheckCircle2 className="mb-2 size-7 text-emerald-500" />
        <p className="text-sm font-medium">No issues detected</p>
        <p className="text-xs">Your architecture passes all validation checks.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-3">
      <div className="space-y-2">
        {issues.map((issue) => {
          const Icon = ICON[issue.severity];
          return (
            <button
              key={issue.id}
              type="button"
              onClick={() => issue.nodeIds[0] && selectNode(issue.nodeIds[0])}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent",
                issue.nodeIds.length === 0 && "cursor-default",
              )}
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", COLOR[issue.severity])} />
              <div className="min-w-0">
                <p className="text-sm font-medium">{issue.title}</p>
                <p className="text-xs text-muted-foreground">{issue.message}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
