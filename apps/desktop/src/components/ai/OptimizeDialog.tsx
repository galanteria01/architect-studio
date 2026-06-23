import { useEffect, useState } from "react";
import { Wand2, Loader2, Check, Database, Copy, Server, Globe } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/store/ui-store";
import { useCanvasStore } from "@/store/canvas-store";
import { aiClient } from "@/services/ai";
import type { OptimizationSuggestion } from "@/services/ai/types";
import { applyOptimization, localOptimize } from "@/lib/advisor";

const ICONS = {
  "add-cache": Copy,
  "add-replica": Server,
  "shard-database": Database,
  "add-cdn": Globe,
  none: Wand2,
} as const;

export function OptimizeDialog() {
  const open = useUIStore((s) => s.optimizeOpen);
  const close = useUIStore((s) => s.closeOptimize);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSuggestions([]);
      setApplied(new Set());
      return;
    }
    const graph = useCanvasStore.getState().getGraph();
    setLoading(true);
    aiClient
      .optimize(graph)
      .then((r) => setSuggestions(r.suggestions))
      .catch(() => setSuggestions(localOptimize(graph)))
      .finally(() => setLoading(false));
  }, [open]);

  const apply = (s: OptimizationSuggestion) => {
    const { nodes, edges } = useCanvasStore.getState();
    const next = applyOptimization(nodes, edges, s);
    useCanvasStore.getState().setElements(next.nodes, next.edges);
    setApplied((prev) => new Set(prev).add(s.id));
    toast.success("Applied", { description: s.title });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-5" /> Auto Optimization
          </DialogTitle>
          <DialogDescription>
            One-click improvements based on simulation and best practices.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" /> Analyzing...
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center text-muted-foreground">
            <Check className="mb-2 size-7 text-emerald-500" />
            <p className="text-sm font-medium">No optimizations needed</p>
            <p className="text-xs">Your architecture already follows the key best practices.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[55vh]">
            <div className="space-y-2 pr-3">
              {suggestions.map((s) => {
                const Icon = ICONS[s.action.kind];
                const done = applied.has(s.id);
                return (
                  <div key={s.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                    <Button size="sm" variant={done ? "secondary" : "default"} disabled={done} onClick={() => apply(s)}>
                      {done ? <Check /> : null}
                      {done ? "Applied" : "Apply"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
