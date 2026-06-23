import { useEffect, useState } from "react";
import { GraduationCap, RefreshCw, Loader2, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useCanvasStore } from "@/store/canvas-store";
import { aiClient } from "@/services/ai";
import type { InterviewEvaluation, InterviewQuestion } from "@/services/ai/types";
import { localInterviewEvaluate, localInterviewQuestion } from "@/lib/advisor";
import { cn } from "@/lib/utils";

export function InterviewPanel() {
  const [question, setQuestion] = useState<InterviewQuestion | null>(null);
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [loadingE, setLoadingE] = useState(false);

  const newQuestion = async () => {
    setLoadingQ(true);
    setEvaluation(null);
    try {
      setQuestion(await aiClient.interviewQuestion());
    } catch {
      setQuestion(localInterviewQuestion());
    } finally {
      setLoadingQ(false);
    }
  };

  useEffect(() => {
    void newQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const evaluate = async () => {
    if (!question) return;
    setLoadingE(true);
    const graph = useCanvasStore.getState().getGraph();
    try {
      setEvaluation(await aiClient.interviewEvaluate(question.question, graph));
    } catch {
      setEvaluation(localInterviewEvaluate(question.question, graph));
    } finally {
      setLoadingE(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <GraduationCap className="size-4 text-primary" />
        <span className="text-sm font-semibold">Interview Mode</span>
        <Button size="icon-sm" variant="ghost" className="ml-auto" onClick={newQuestion} disabled={loadingQ}>
          <RefreshCw className={cn("size-3.5", loadingQ && "animate-spin")} />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3">
          <div className="rounded-xl border bg-primary/5 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Question
            </p>
            <p className="text-sm font-medium">
              {loadingQ ? "Loading..." : question?.question}
            </p>
          </div>

          {question && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What we look for
              </p>
              <ul className="space-y-1">
                {question.rubric.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button className="w-full" onClick={evaluate} disabled={loadingE}>
            {loadingE ? <Loader2 className="animate-spin" /> : <Trophy />}
            Evaluate my solution
          </Button>

          {evaluation && (
            <div className="space-y-3 rounded-xl border p-3">
              <div className="flex items-center gap-3">
                <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-full border-4 border-primary/30">
                  <span className="text-xl font-bold tabular-nums">{evaluation.score}</span>
                </div>
                <p className="text-sm text-muted-foreground">{evaluation.feedback}</p>
              </div>

              {evaluation.good.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-emerald-500">Covered</p>
                  <div className="space-y-1">
                    {evaluation.good.map((g, i) => (
                      <p key={i} className="flex items-center gap-1.5 text-sm">
                        <CheckCircle2 className="size-3.5 text-emerald-500" /> {g}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {evaluation.missing.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-amber-500">Missing</p>
                  <div className="space-y-1">
                    {evaluation.missing.map((g, i) => (
                      <p key={i} className="flex items-center gap-1.5 text-sm">
                        <XCircle className="size-3.5 text-amber-500" /> {g}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {evaluation.fallback && (
                <Badge variant="outline" className="text-[10px]">
                  Heuristic evaluation
                </Badge>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
