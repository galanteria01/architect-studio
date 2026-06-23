import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { FolderOpen, Trash2, FileClock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui-store";
import { useProjectStore } from "@/store/project-store";
import { cn } from "@/lib/utils";

export function ProjectsSheet() {
  const open = useUIStore((s) => s.projectsOpen);
  const setOpen = useUIStore((s) => s.setProjectsOpen);
  const { projects, currentUuid, refreshProjects, loadProject, deleteProject } =
    useProjectStore(
      useShallow((s) => ({
        projects: s.projects,
        currentUuid: s.projectUuid,
        refreshProjects: s.refreshProjects,
        loadProject: s.loadProject,
        deleteProject: s.deleteProject,
      })),
    );

  useEffect(() => {
    if (open) void refreshProjects();
  }, [open, refreshProjects]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <FolderOpen className="size-4" /> Projects
          </SheetTitle>
          <SheetDescription>Saved architectures on this device.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100%-5rem)]">
          <div className="space-y-1 p-3">
            {projects.length === 0 && (
              <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                No saved projects yet. Use Save to store one.
              </p>
            )}
            {projects.map((p) => (
              <div
                key={p.uuid}
                className={cn(
                  "group flex items-center gap-2 rounded-lg border p-2.5",
                  p.uuid === currentUuid && "border-primary/50 bg-primary/5",
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={async () => {
                    await loadProject(p.uuid);
                    setOpen(false);
                  }}
                >
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileClock className="size-3" />
                    {new Date(p.updatedAt).toLocaleString()}
                  </p>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => deleteProject(p.uuid)}
                  aria-label="Delete project"
                >
                  <Trash2 className="size-3.5 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
