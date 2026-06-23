import { useEffect, useState } from "react";
import { ClipboardCheck, Loader2, ThumbsUp, ThumbsDown, Lightbulb } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/store/ui-store";
import { useCanvasStore } from "@/store/canvas-store";
import { aiClient } from "@/services/ai";
import type { ReviewResponse } from "@/services/ai/types";
import { localReview } from "@/lib/advisor";
import { cn } from "@/lib/utils";

const SCORE_LABELS: { key: keyof ReviewResponse["scores"]; label: string }[] = [
  { key: "scalability", label: "Scalability" },
  { key: "reliability", label: "Reliability" },
  { key: "performance", label: "Performance" },
  { key: "cost", label: "Cost Efficiency" },
  { key: "maintainability", label: "Maintainability" },
];

function scoreColor(v: number) {
  if (v >= 75) return "bg-emerald-500";
  if (v >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function AIReviewDialog() {
  const open = useUIStore((s) => s.reviewOpen);
  const close = useUIStore((s) => s.closeReview);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ReviewResponse | null>(null);

  useEffect(() => {
    if (!open) {
      setReview(null);
      return;
    }
    const graph = useCanvasStore.getState().getGraph();
    setLoading(true);
    aiClient
      .review(graph)
      .then(setReview)
      .catch(() => setReview(localReview(graph)))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-5" /> Architecture Review
          </DialogTitle>
          <DialogDescription>
            Scored on scalability, reliability, performance, cost, and maintainability.
          </DialogDescription>
        </DialogHeader>

        {loading || !review ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" /> Analyzing architecture...
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-3">
              <div className="flex items-center gap-4 rounded-xl border p-4">
                <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-full border-4 border-primary/30">
                  <span className="text-2xl font-bold tabular-nums">{review.overall}</span>
                </div>
                <p className="text-sm text-muted-foreground">{review.summary}</p>
              </div>

              <div className="space-y-2.5">
                {SCORE_LABELS.map(({ key, label }) => {
                  const v = review.scores[key];
                  return (
                    <div key={key}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{label}</span>
                        <span className="font-medium tabular-nums">{Math.round(v)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full transition-all", scoreColor(v))} style={{ width: `${v}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewList icon={ThumbsUp} color="text-emerald-500" title="Strengths" items={review.strengths} />
                <ReviewList icon={ThumbsDown} color="text-red-500" title="Weaknesses" items={review.weaknesses} />
              </div>
              <ReviewList icon={Lightbulb} color="text-amber-500" title="Suggestions" items={review.suggestions} />
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReviewList({
  icon: Icon,
  color,
  title,
  items,
}: {
  icon: typeof ThumbsUp;
  color: string;
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={cn("mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", color)}>
        <Icon className="size-3.5" /> {title}
      </p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-muted-foreground">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
