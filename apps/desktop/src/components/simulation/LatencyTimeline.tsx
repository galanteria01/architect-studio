import { useMemo } from "react";
import { GanttChartSquare } from "lucide-react";
import { useSimulationStore } from "@/store/simulation-store";
import { useCanvasStore } from "@/store/canvas-store";
import { categoryStyle } from "@/lib/category-style";
import { formatLatency } from "@/lib/format";

/** Visualizes latency accumulation along the slowest successful request path. */
export function LatencyTimeline() {
  const result = useSimulationStore((s) => s.result);
  const nodes = useCanvasStore((s) => s.nodes);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const path = useMemo(() => {
    if (!result) return null;
    const ok = result.paths.filter((p) => p.ok);
    const pool = ok.length ? ok : result.paths;
    return pool.reduce(
      (best, p) => (p.totalLatencyMs > (best?.totalLatencyMs ?? -1) ? p : best),
      pool[0],
    );
  }, [result]);

  if (!result || !path) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <GanttChartSquare className="mb-2 size-7 opacity-50" />
        <p className="text-sm font-medium">No timeline</p>
        <p className="text-xs">Run a simulation to see latency accumulate hop by hop.</p>
      </div>
    );
  }

  const hops = path.nodeIds
    .map((id) => nodeById.get(id))
    .filter(Boolean)
    .map((n) => ({
      id: n!.id,
      label: n!.data.label,
      latency: n!.data.metrics.latencyMs,
      category: n!.data.category,
    }));

  const total = hops.reduce((s, h) => s + h.latency, 0) || 1;
  let cumulative = 0;

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">Critical path latency</p>
        <p className="font-mono text-sm tabular-nums text-muted-foreground">
          {formatLatency(path.totalLatencyMs)}
        </p>
      </div>

      <div className="flex h-7 w-full overflow-hidden rounded-md border">
        {hops.map((h) => {
          const style = categoryStyle(h.category);
          const width = (h.latency / total) * 100;
          return (
            <div
              key={h.id}
              className="h-full border-r last:border-r-0"
              style={{ width: `${width}%`, background: `${style.color}55` }}
              title={`${h.label}: ${formatLatency(h.latency)}`}
            />
          );
        })}
      </div>

      <div className="mt-4 space-y-1.5">
        {hops.map((h) => {
          const style = categoryStyle(h.category);
          cumulative += h.latency;
          return (
            <div key={h.id} className="flex items-center gap-3 text-sm">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: style.color }} />
              <span className="w-40 shrink-0 truncate">{h.label}</span>
              <span className="w-16 shrink-0 text-right font-mono tabular-nums text-muted-foreground">
                +{formatLatency(h.latency)}
              </span>
              <span className="font-mono tabular-nums text-xs text-muted-foreground">
                = {formatLatency(cumulative)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
