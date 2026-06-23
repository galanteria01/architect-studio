import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ComponentLibrary } from "@/components/sidebar/ComponentLibrary";
import { ArchitectureCanvas } from "@/components/canvas/ArchitectureCanvas";
import { BottomPanel } from "@/components/simulation/BottomPanel";
import { PropertiesPanel } from "@/components/properties/PropertiesPanel";

export function BuilderPage() {
  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
      <ResizablePanel defaultSize="18%" minSize="14%" maxSize="28%" className="bg-card">
        <ComponentLibrary />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize="58%" minSize="30%">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel defaultSize="64%" minSize="30%">
            <div className="relative h-full w-full">
              <ArchitectureCanvas />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="36%" minSize="8%">
            <BottomPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize="24%" minSize="18%" maxSize="34%" className="bg-card">
        <PropertiesPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
