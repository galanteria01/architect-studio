import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { AlertTriangle, Power } from "lucide-react";
import type { ArchitectureNode, NodeStatus } from "@/types";
import { getIcon } from "@/lib/icons";
import { categoryStyle } from "@/lib/category-style";
import { cn } from "@/lib/utils";

const STATUS_RING: Record<NodeStatus, string> = {
  idle: "ring-border",
  healthy: "ring-emerald-500/70",
  warning: "ring-amber-500/80",
  overloaded: "ring-red-500",
  down: "ring-red-500/60",
};

const STATUS_DOT: Record<NodeStatus, string> = {
  idle: "bg-muted-foreground/40",
  healthy: "bg-emerald-500",
  warning: "bg-amber-500",
  overloaded: "bg-red-500",
  down: "bg-red-500",
};

function ArchitectureNodeViewImpl({ data, selected }: NodeProps<ArchitectureNode>) {
  const style = categoryStyle(data.category);
  const Icon = getIcon(data.icon);
  const status = data.status;
  const util = Math.min(1, data.utilization);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: data.disabled ? 0.5 : 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "group relative w-[184px] rounded-xl border bg-card/95 backdrop-blur shadow-sm ring-2 transition-colors",
        style.border,
        STATUS_RING[status],
        selected && "ring-primary",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-background"
        style={{ background: style.color }}
      />

      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", style.bg)}>
          <Icon className={cn("size-5", style.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight">{data.label}</div>
          <div className="text-[11px] text-muted-foreground">{style.label}</div>
        </div>
        {status !== "idle" && (
          <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[status], status === "overloaded" && "animate-pulse")} />
        )}
      </div>

      {/* utilization bar (only while a simulation has run) */}
      {data.inboundRps > 0 && (
        <div className="px-3 pb-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                util > 1 ? "bg-red-500" : util > 0.75 ? "bg-amber-500" : "bg-emerald-500",
              )}
              style={{ width: `${Math.min(100, util * 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{Math.round(data.inboundRps).toLocaleString()} rps</span>
            <span>{Math.round(util * 100)}%</span>
          </div>
        </div>
      )}

      {data.disabled && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
          <Power className="size-5 text-red-500" />
        </div>
      )}
      {status === "overloaded" && !data.disabled && (
        <div className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow">
          <AlertTriangle className="size-3" />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-background"
        style={{ background: style.color }}
      />
    </motion.div>
  );
}

export const ArchitectureNodeView = memo(ArchitectureNodeViewImpl);
