import { cn } from "@/lib/utils";
import type { MetricCard as MetricCardType } from "@/hooks/useMetrics";

const TONE: Record<MetricCardType["tone"], string> = {
  default: "text-foreground",
  good: "text-emerald-500",
  warn: "text-amber-500",
  bad: "text-red-500",
};

export function MetricCard({ card }: { card: MetricCardType }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {card.label}
      </p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", TONE[card.tone])}>
        {card.value}
      </p>
    </div>
  );
}
