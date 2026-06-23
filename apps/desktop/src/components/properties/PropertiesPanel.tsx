import { useShallow } from "zustand/react/shallow";
import { Trash2, Power, GraduationCap, SlidersHorizontal, Settings2, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCanvasStore } from "@/store/canvas-store";
import { useUIStore } from "@/store/ui-store";
import { getComponentSpec } from "@/data/components";
import { getIcon } from "@/lib/icons";
import { categoryStyle } from "@/lib/category-style";
import { formatAvailability, formatDowntime } from "@/lib/format";
import { REGIONS } from "@/data/regions";
import { cn } from "@/lib/utils";
import type { NodeMetrics } from "@/types";

const METRIC_FIELDS: { key: keyof NodeMetrics; label: string; step: number; suffix: string }[] = [
  { key: "latencyMs", label: "Latency", step: 1, suffix: "ms" },
  { key: "throughputRps", label: "Throughput", step: 100, suffix: "rps" },
  { key: "capacityRps", label: "Capacity", step: 100, suffix: "rps" },
  { key: "costMonthly", label: "Cost / mo", step: 10, suffix: "$" },
  { key: "replicas", label: "Replicas", step: 1, suffix: "x" },
];

export function PropertiesPanel() {
  const rightTab = useUIStore((s) => s.rightTab);
  const setRightTab = useUIStore((s) => s.setRightTab);
  const { selectedNodeId, nodes, updateNodeMetrics, updateNodeData, renameNode, setNodeDisabled, deleteNode } =
    useCanvasStore(
      useShallow((s) => ({
        selectedNodeId: s.selectedNodeId,
        nodes: s.nodes,
        updateNodeMetrics: s.updateNodeMetrics,
        updateNodeData: s.updateNodeData,
        renameNode: s.renameNode,
        setNodeDisabled: s.setNodeDisabled,
        deleteNode: s.deleteNode,
      })),
    );

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null;

  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <SlidersHorizontal className="mb-3 size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">No selection</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Select a component on the canvas to edit its properties, metrics, and learn about it.
        </p>
      </div>
    );
  }

  const spec = getComponentSpec(node.data.componentType);
  const style = categoryStyle(node.data.category);
  const Icon = getIcon(node.data.icon);
  const m = node.data.metrics;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b p-3">
        <span className={cn("flex size-9 items-center justify-center rounded-lg", style.bg)}>
          <Icon className={cn("size-5", style.text)} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{node.data.label}</p>
          <Badge variant="secondary" className="mt-0.5 h-4 px-1.5 text-[10px]">
            {style.label}
          </Badge>
        </div>
      </div>

      <Tabs
        value={rightTab}
        onValueChange={(v) => setRightTab(v as typeof rightTab)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <TabsList className="mx-3 mt-3 w-auto">
          <TabsTrigger value="properties">
            <SlidersHorizontal /> Props
          </TabsTrigger>
          <TabsTrigger value="learning">
            <GraduationCap /> Learn
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 /> Config
          </TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------- PROPERTIES */}
        <TabsContent value="properties" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="node-label">Name</Label>
                <Input
                  id="node-label"
                  value={node.data.label}
                  onChange={(e) => renameNode(node.id, e.target.value)}
                  className="h-8"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {METRIC_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {f.label} <span className="opacity-60">({f.suffix})</span>
                    </Label>
                    <Input
                      type="number"
                      step={f.step}
                      min={0}
                      value={m[f.key]}
                      onChange={(e) =>
                        updateNodeMetrics(node.id, {
                          [f.key]: Math.max(0, Number(e.target.value)),
                        })
                      }
                      className="h-8"
                    />
                  </div>
                ))}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Availability (%)</Label>
                  <Input
                    type="number"
                    step={0.001}
                    min={0}
                    max={100}
                    value={(m.availability * 100).toFixed(3)}
                    onChange={(e) =>
                      updateNodeMetrics(node.id, {
                        availability: Math.min(1, Math.max(0, Number(e.target.value) / 100)),
                      })
                    }
                    className="h-8"
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Instance availability</span>
                  <span className="font-medium">{formatAvailability(m.availability)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Est. downtime</span>
                  <span className="font-medium">{formatDowntime(m.availability)}</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ------------------------------------------------------- LEARNING */}
        <TabsContent value="learning" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-3 text-sm">
              {spec ? (
                <>
                  <Section title="Purpose">{spec.learning.purpose}</Section>
                  <ListSection title="Use Cases" items={spec.learning.useCases} />
                  <ListSection title="Tradeoffs" items={spec.learning.tradeoffs} />
                  <ListSection title="Interview Notes" items={spec.learning.interviewNotes} />
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Building2 className="size-3.5" /> Used By
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {spec.learning.companies.map((c) => (
                        <Badge key={c} variant="outline" className="font-normal">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No learning information available.</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* --------------------------------------------------------- CONFIG */}
        <TabsContent value="config" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4 p-3">
              <div className="space-y-1.5">
                <Label>Region</Label>
                <Select
                  value={node.data.region}
                  onValueChange={(v) => updateNodeData(node.id, { region: v ?? node.data.region })}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-2.5">
                <div className="flex items-center gap-2">
                  <Power className={cn("size-4", node.data.disabled ? "text-red-500" : "text-muted-foreground")} />
                  <div>
                    <p className="text-sm font-medium">Failure injection</p>
                    <p className="text-xs text-muted-foreground">Simulate this node being down</p>
                  </div>
                </div>
                <Switch
                  checked={node.data.disabled}
                  onCheckedChange={(v) => setNodeDisabled(node.id, v)}
                />
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => deleteNode(node.id)}
              >
                <Trash2 /> Delete component
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
