import { Fragment } from "react";
import { ArrowRight, Route, XCircle, CheckCircle2 } from "lucide-react";
import { useSimulationStore } from "@/store/simulation-store";
import { useCanvasStore } from "@/store/canvas-store";
import { formatLatency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function RequestTrace() {
  const result = useSimulationStore((s) => s.result);
  const nodes = useCanvasStore((s) => s.nodes);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  if (!result || result.paths.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <Route className="mb-2 size-7 opacity-50" />
        <p className="text-sm font-medium">No request paths</p>
        <p className="text-xs">Connect a client to your services, then run a simulation.</p>
      </div>
    );
  }

  const sorted = [...result.paths].sort((a, b) => b.totalLatencyMs - a.totalLatencyMs);

  return (
    <div className="h-full overflow-auto p-3">
      <div className="space-y-2">
        {sorted.slice(0, 40).map((path) => (
          <div
            key={path.id}
            className={cn(
              "rounded-lg border p-2.5",
              path.ok ? "bg-card" : "border-red-500/40 bg-red-500/5",
            )}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                {path.ok ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="size-3.5 text-red-500" />
                )}
                {path.ok ? "OK" : "Failed"}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {formatLatency(path.totalLatencyMs)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
              {path.nodeIds.map((id, i) => {
                const node = nodeById.get(id);
                const failed = path.failedAt === id;
                return (
                  <Fragment key={id}>
                    {i > 0 && <ArrowRight className="size-3 text-muted-foreground/50" />}
                    <button
                      type="button"
                      onClick={() => selectNode(id)}
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-xs transition-colors hover:bg-accent",
                        failed && "border-red-500 text-red-500",
                      )}
                    >
                      {node?.data.label ?? id}
                    </button>
                  </Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
