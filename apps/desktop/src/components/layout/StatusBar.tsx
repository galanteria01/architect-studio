import { useShallow } from "zustand/react/shallow";
import { Boxes, Cable, Globe2, Sparkles, CircleDot } from "lucide-react";
import { useCanvasStore } from "@/store/canvas-store";
import { useSimulationStore } from "@/store/simulation-store";
import { useAiStatus } from "@/hooks/useAiStatus";
import { formatRps } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const aiOnline = useAiStatus();
  const { nodeCount, edgeCount, regionCount } = useCanvasStore(
    useShallow((s) => ({
      nodeCount: s.nodes.length,
      edgeCount: s.edges.length,
      regionCount: new Set(s.nodes.map((n) => n.data.region)).size,
    })),
  );
  const running = useSimulationStore((s) => s.running);
  const rps = useSimulationStore((s) => s.params.rps);

  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t bg-card px-3 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <Boxes className="size-3" /> {nodeCount} nodes
      </span>
      <span className="flex items-center gap-1">
        <Cable className="size-3" /> {edgeCount} edges
      </span>
      <span className="flex items-center gap-1">
        <Globe2 className="size-3" /> {regionCount} region{regionCount === 1 ? "" : "s"}
      </span>
      {running && (
        <span className="flex items-center gap-1 text-emerald-500">
          <CircleDot className="size-3 animate-pulse" /> simulating @ {formatRps(rps)}
        </span>
      )}
      <span className="ml-auto flex items-center gap-1.5">
        <Sparkles className={cn("size-3", aiOnline ? "text-violet-400" : "text-muted-foreground/50")} />
        {aiOnline ? "AI sidecar online" : "AI offline — using heuristics"}
        <span className={cn("size-1.5 rounded-full", aiOnline ? "bg-emerald-500" : "bg-muted-foreground/40")} />
      </span>
    </footer>
  );
}
