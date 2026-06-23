import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ComponentLibrary } from "@/components/sidebar/ComponentLibrary";
import { ArchitectureCanvas } from "@/components/canvas/ArchitectureCanvas";
import { InterviewPanel } from "@/components/interview/InterviewPanel";

export function InterviewPage() {
  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
      <ResizablePanel defaultSize="18%" minSize="14%" maxSize="28%" className="bg-card">
        <ComponentLibrary />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="56%" minSize="30%">
        <div className="relative h-full w-full">
          <ArchitectureCanvas />
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="26%" minSize="20%" maxSize="36%" className="bg-card">
        <InterviewPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
