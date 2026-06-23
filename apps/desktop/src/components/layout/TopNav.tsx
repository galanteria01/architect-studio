import { useShallow } from "zustand/react/shallow";
import {
  Sparkles,
  ClipboardCheck,
  Wand2,
  Save,
  FolderOpen,
  FilePlus2,
  Download,
  Image,
  Share2,
  Moon,
  Sun,
  Workflow,
  GraduationCap,
  LayoutGrid,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SimulationControls } from "@/components/simulation/SimulationControls";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";
import { useCanvasStore } from "@/store/canvas-store";
import { exportJson, exportPng, copyShare } from "@/services/export";
import { cn } from "@/lib/utils";

export function TopNav() {
  const {
    projectName,
    dirty,
    renameCurrent,
    saveCurrent,
    newProject,
    theme,
    setTheme,
  } = useProjectStore(
    useShallow((s) => ({
      projectName: s.projectName,
      dirty: s.dirty,
      renameCurrent: s.renameCurrent,
      saveCurrent: s.saveCurrent,
      newProject: s.newProject,
      theme: s.theme,
      setTheme: s.setTheme,
    })),
  );
  const { page, setPage, openGenerator, openReview, openOptimize, setProjectsOpen } =
    useUIStore(
      useShallow((s) => ({
        page: s.page,
        setPage: s.setPage,
        openGenerator: s.openGenerator,
        openReview: s.openReview,
        openOptimize: s.openOptimize,
        setProjectsOpen: s.setProjectsOpen,
      })),
    );

  const handleSave = async () => {
    try {
      await saveCurrent();
      toast.success("Project saved");
    } catch (e) {
      toast.error("Save failed", { description: String(e) });
    }
  };

  const handleExport = () => {
    exportJson(projectName, useCanvasStore.getState().getGraph());
    toast.success("Exported architecture JSON");
  };

  const handleExportPng = async () => {
    try {
      await exportPng(projectName);
      toast.success("Exported architecture PNG");
    } catch (e) {
      toast.error("PNG export failed", { description: String(e) });
    }
  };

  const handleShare = async () => {
    try {
      await copyShare(projectName, useCanvasStore.getState().getGraph());
      toast.success("Copied shareable JSON to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-card px-3">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
          <Workflow className="size-4" />
        </div>
        <span className="hidden text-sm font-semibold sm:inline">Architect Studio</span>
      </div>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Page switch */}
      <div className="flex items-center rounded-lg border bg-background p-0.5">
        <PageTab active={page === "builder"} onClick={() => setPage("builder")} icon={LayoutGrid}>
          Builder
        </PageTab>
        <PageTab active={page === "interview"} onClick={() => setPage("interview")} icon={GraduationCap}>
          Interview
        </PageTab>
      </div>

      {/* Project name */}
      <div className="flex min-w-0 items-center gap-1.5">
        <Input
          value={projectName}
          onChange={(e) => renameCurrent(e.target.value)}
          className="h-7 w-40 border-transparent bg-transparent px-2 text-sm font-medium hover:border-border focus-visible:border-border"
        />
        {dirty ? (
          <span className="size-1.5 rounded-full bg-amber-500" title="Unsaved changes" />
        ) : (
          <Check className="size-3.5 text-emerald-500" />
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {page === "builder" && <SimulationControls />}

        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-8" onClick={openGenerator}>
            <Sparkles className="text-violet-400" /> Generate
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={openReview}>
            <ClipboardCheck /> Review
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={openOptimize}>
            <Wand2 /> Optimize
          </Button>
        </div>

        <div className="mx-1 h-5 w-px bg-border" />

        <Button size="icon" variant="ghost" className="size-8" onClick={() => newProject()} title="New">
          <FilePlus2 className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={() => setProjectsOpen(true)} title="Open projects">
          <FolderOpen className="size-4" />
        </Button>
        <Button size="sm" variant={dirty ? "default" : "secondary"} className="h-8" onClick={handleSave}>
          <Save /> Save
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="icon" variant="ghost" className="size-8" title="Export & share">
                <Download className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExport}>
              <Download /> Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPng}>
              <Image /> Export PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare}>
              <Share2 /> Copy share link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>
    </header>
  );
}

function PageTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof LayoutGrid;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {children}
    </button>
  );
}
