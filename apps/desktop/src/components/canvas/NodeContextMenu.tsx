import { useShallow } from "zustand/react/shallow";
import { Copy, Pencil, Power, Trash2 } from "lucide-react";
import { useCanvasStore } from "@/store/canvas-store";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

export interface NodeMenuState {
  nodeId: string;
  top: number;
  left: number;
}

interface Props {
  menu: NodeMenuState;
  onClose: () => void;
}

export function NodeContextMenu({ menu, onClose }: Props) {
  const { node, selectNode, duplicateNode, setNodeDisabled, deleteNode } = useCanvasStore(
    useShallow((s) => ({
      node: s.nodes.find((n) => n.id === menu.nodeId),
      selectNode: s.selectNode,
      duplicateNode: s.duplicateNode,
      setNodeDisabled: s.setNodeDisabled,
      deleteNode: s.deleteNode,
    })),
  );
  const setRightTab = useUIStore((s) => s.setRightTab);

  if (!node) return null;
  const disabled = node.data.disabled;

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <div
      className="absolute z-50 min-w-44 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ top: menu.top, left: menu.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="truncate px-2 py-1 text-xs font-medium text-muted-foreground">{node.data.label}</p>
      <MenuItem
        icon={Pencil}
        label="Edit properties"
        onClick={run(() => {
          selectNode(node.id);
          setRightTab("properties");
        })}
      />
      <MenuItem icon={Copy} label="Duplicate" shortcut="⌘D" onClick={run(() => duplicateNode(node.id))} />
      <MenuItem
        icon={Power}
        label={disabled ? "Enable" : "Disable (fail)"}
        onClick={run(() => setNodeDisabled(node.id, !disabled))}
      />
      <div className="my-1 h-px bg-border" />
      <MenuItem
        icon={Trash2}
        label="Delete"
        shortcut="⌫"
        destructive
        onClick={run(() => deleteNode(node.id))}
      />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  shortcut,
  destructive,
  onClick,
}: {
  icon: typeof Trash2;
  label: string;
  shortcut?: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
        destructive && "text-red-500 hover:bg-red-500/10",
      )}
    >
      <Icon className="size-4" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <span className="text-xs text-muted-foreground">{shortcut}</span>}
    </button>
  );
}
