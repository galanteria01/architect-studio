import { Star } from "lucide-react";
import type { ComponentSpec } from "@/types";
import { getIcon } from "@/lib/icons";
import { categoryStyle } from "@/lib/category-style";
import { cn } from "@/lib/utils";
import { setDragComponent } from "./drag";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  spec: ComponentSpec;
  favorite: boolean;
  onToggleFavorite: (type: string) => void;
  onAdd: (type: string) => void;
}

export function ComponentLibraryItem({ spec, favorite, onToggleFavorite, onAdd }: Props) {
  const style = categoryStyle(spec.category);
  const Icon = getIcon(spec.icon);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            draggable
            onDragStart={(e) => setDragComponent(e, spec.type)}
            onDoubleClick={() => onAdd(spec.type)}
            className={cn(
              "group flex cursor-grab items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm transition-colors hover:border-border hover:bg-accent active:cursor-grabbing",
            )}
          >
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", style.bg)}>
              <Icon className={cn("size-4", style.text)} />
            </span>
            <span className="min-w-0 flex-1 truncate">{spec.label}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(spec.type);
              }}
              className={cn(
                "opacity-0 transition-opacity group-hover:opacity-100",
                favorite && "opacity-100",
              )}
              aria-label={favorite ? "Remove favorite" : "Add favorite"}
            >
              <Star className={cn("size-3.5", favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
            </button>
          </div>
        }
      />
      <TooltipContent side="right" className="max-w-[220px]">
        <p className="font-medium">{spec.label}</p>
        <p className="text-xs text-muted-foreground">{spec.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
