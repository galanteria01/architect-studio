import { useMemo } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { categoryStyle } from "@/lib/category-style";
import { formatCost } from "@/lib/format";
import type { ComponentCategory } from "@/types";

export function CostReport() {
  const nodes = useCanvasStore((s) => s.nodes);

  const { byCategory, total, topNodes } = useMemo(() => {
    const byCategory = new Map<ComponentCategory, number>();
    const perNode: { label: string; cost: number; category: ComponentCategory }[] = [];
    let total = 0;
    for (const n of nodes) {
      const cost = n.data.metrics.costMonthly * Math.max(1, n.data.metrics.replicas);
      total += cost;
      byCategory.set(n.data.category, (byCategory.get(n.data.category) ?? 0) + cost);
      perNode.push({ label: n.data.label, cost, category: n.data.category });
    }
    const topNodes = perNode.sort((a, b) => b.cost - a.cost).slice(0, 5);
    return { byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]), total, topNodes };
  }, [nodes]);

  if (nodes.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Cost by category</p>
          <p className="text-sm font-semibold">{formatCost(total)}/mo</p>
        </div>
        <div className="space-y-1.5">
          {byCategory.map(([cat, cost]) => {
            const style = categoryStyle(cat);
            const pct = total ? (cost / total) * 100 : 0;
            return (
              <div key={cat}>
                <div className="mb-0.5 flex justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: style.color }} />
                    {style.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{formatCost(cost)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: style.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Most expensive components</p>
        <div className="space-y-1.5">
          {topNodes.map((n, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: categoryStyle(n.category).color }} />
                {n.label}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">{formatCost(n.cost)}/mo</span>
            </div>
          ))}
        </div>
        <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
          Projected annual: <span className="font-medium text-foreground">{formatCost(total * 12)}</span>
        </p>
      </div>
    </div>
  );
}
