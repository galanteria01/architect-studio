import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { TopNav } from "@/components/layout/TopNav";
import { StatusBar } from "@/components/layout/StatusBar";
import { BuilderPage } from "@/pages/BuilderPage";
import { InterviewPage } from "@/pages/InterviewPage";
import { AIGeneratorDialog } from "@/components/ai/AIGeneratorDialog";
import { AIReviewDialog } from "@/components/ai/AIReviewDialog";
import { OptimizeDialog } from "@/components/ai/OptimizeDialog";
import { ProjectsSheet } from "@/components/projects/ProjectsSheet";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";

export default function App() {
  const init = useProjectStore((s) => s.init);
  const page = useUIStore((s) => s.page);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <ReactFlowProvider>
      <TooltipProvider delay={300}>
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
          <TopNav />
          <main className="flex min-h-0 flex-1">
            {page === "interview" ? <InterviewPage /> : <BuilderPage />}
          </main>
          <StatusBar />
        </div>

        <AIGeneratorDialog />
        <AIReviewDialog />
        <OptimizeDialog />
        <ProjectsSheet />
        <Toaster richColors position="bottom-right" />
      </TooltipProvider>
    </ReactFlowProvider>
  );
}
