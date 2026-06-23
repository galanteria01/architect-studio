import { useState } from "react";
import { Sparkles, Loader2, Wand2, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/store/ui-store";
import { useCanvasStore } from "@/store/canvas-store";
import { useProjectStore } from "@/store/project-store";
import { aiClient, fromAIGraph } from "@/services/ai";
import { localGenerate, type LocalGenerateResult } from "@/lib/advisor";
import { formatCost } from "@/lib/format";

const EXAMPLES = [
  "Design Instagram for 50M DAU",
  "Design a URL shortener for 10M users",
  "Design a RAG chatbot over company docs",
  "Design a realtime chat app for 1M users",
];

export function AIGeneratorDialog() {
  const open = useUIStore((s) => s.generatorOpen);
  const close = useUIStore((s) => s.closeGenerator);
  const loadGraph = useCanvasStore((s) => s.loadGraph);
  const renameCurrent = useProjectStore((s) => s.renameCurrent);

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(LocalGenerateResult & { fallback: boolean }) | null>(null);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const resp = await aiClient.generate(prompt);
      setResult({
        graph: fromAIGraph(resp.architecture),
        requirements: resp.requirements,
        notes: resp.notes,
        cost: resp.costEstimate,
        fallback: Boolean(resp.fallback),
      });
    } catch {
      const local = localGenerate(prompt);
      setResult({ ...local, fallback: true });
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!result) return;
    loadGraph(result.graph);
    renameCurrent(prompt.trim().slice(0, 60) || "Generated Architecture");
    toast.success("Architecture generated", { description: "Editable nodes added to the canvas." });
    reset();
  };

  const reset = () => {
    setResult(null);
    setPrompt("");
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : reset())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-violet-400" /> AI Architecture Generator
          </DialogTitle>
          <DialogDescription>
            Describe the system you want to design. The AI produces requirements and an editable
            architecture.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Design Instagram for 50M DAU..."
              rows={3}
              autoFocus
            />
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-4 pr-3">
              {result.fallback && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs">
                  <Info className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <span>
                    Generated with the built-in heuristic engine (no AI provider connected). Configure a
                    provider key in the sidecar for model-generated designs.
                  </span>
                </div>
              )}
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Requirements
                </p>
                <ul className="space-y-1">
                  {result.requirements.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <Badge variant="secondary">{result.graph.nodes.length} components</Badge>
                <Badge variant="secondary">{result.graph.edges.length} connections</Badge>
                <span className="ml-auto font-medium">Est. {formatCost(result.cost)}/mo</span>
              </div>
              <p className="text-xs text-muted-foreground">{result.notes}</p>
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {!result ? (
            <Button onClick={generate} disabled={loading || !prompt.trim()}>
              {loading ? <Loader2 className="animate-spin" /> : <Wand2 />}
              Generate
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setResult(null)}>
                Back
              </Button>
              <Button onClick={apply}>
                <CheckCircle2 /> Apply to canvas
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
