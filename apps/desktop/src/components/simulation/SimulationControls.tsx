import { useShallow } from "zustand/react/shallow";
import { Pause, Play, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useSimulationStore } from "@/store/simulation-store";
import { formatRps } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SimulationControls() {
  const { running, params, animate, start, stop, runOnce, reset, setParams, setAnimate } =
    useSimulationStore(
      useShallow((s) => ({
        running: s.running,
        params: s.params,
        animate: s.animate,
        start: s.start,
        stop: s.stop,
        runOnce: s.runOnce,
        reset: s.reset,
        setParams: s.setParams,
        setAnimate: s.setAnimate,
      })),
    );

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1">
      <Button
        size="sm"
        variant={running ? "secondary" : "default"}
        className="h-7"
        onClick={() => (running ? stop() : start())}
      >
        {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        {running ? "Pause" : "Run"}
      </Button>
      <Button size="icon" variant="ghost" className="size-7" onClick={() => runOnce()} title="Step once">
        <Zap className="size-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="size-7" onClick={() => reset()} title="Reset">
        <RotateCcw className="size-3.5" />
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      <div className="flex w-44 items-center gap-2">
        <span className="text-xs text-muted-foreground">Load</span>
        <Slider
          value={[params.rps]}
          min={100}
          max={100000}
          step={100}
          onValueChange={(v) => setParams({ rps: Array.isArray(v) ? v[0] : v })}
          className="flex-1"
        />
        <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums">
          {formatRps(params.rps)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setAnimate(!animate)}
        className={cn(
          "rounded-md px-1.5 py-1 text-xs transition-colors",
          animate ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
        title="Toggle request animation"
      >
        <Zap className={cn("size-3.5", animate && "fill-primary")} />
      </button>
    </div>
  );
}
