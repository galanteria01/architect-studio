import { ChevronDown, ChevronUp, Gauge, GanttChartSquare, Route, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUIStore, type BottomTab } from "@/store/ui-store";
import { useValidation } from "@/hooks/useValidation";
import { cn } from "@/lib/utils";
import { MetricsDashboard } from "@/components/metrics/MetricsDashboard";
import { RequestTrace } from "./RequestTrace";
import { LatencyTimeline } from "./LatencyTimeline";
import { ValidationList } from "@/components/validation/ValidationList";

const TABS: { id: BottomTab; label: string; icon: typeof Gauge }[] = [
  { id: "metrics", label: "Metrics", icon: Gauge },
  { id: "timeline", label: "Timeline", icon: GanttChartSquare },
  { id: "trace", label: "Request Trace", icon: Route },
  { id: "issues", label: "Issues", icon: ShieldAlert },
];

export function BottomPanel() {
  const { bottomTab, setBottomTab, bottomCollapsed, toggleBottom } = useUIStore();
  const { issues, errors } = useValidation();

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b px-2">
        <div className="flex items-center">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = bottomTab === t.id && !bottomCollapsed;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setBottomTab(t.id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {t.label}
                {t.id === "issues" && issues.length > 0 && (
                  <Badge
                    variant={errors.length ? "destructive" : "secondary"}
                    className="h-4 px-1 text-[10px]"
                  >
                    {issues.length}
                  </Badge>
                )}
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-primary" />}
              </button>
            );
          })}
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={toggleBottom}>
          {bottomCollapsed ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>

      {!bottomCollapsed && (
        <div className="min-h-0 flex-1">
          {bottomTab === "metrics" && <MetricsDashboard />}
          {bottomTab === "timeline" && <LatencyTimeline />}
          {bottomTab === "trace" && <RequestTrace />}
          {bottomTab === "issues" && <ValidationList />}
        </div>
      )}
    </div>
  );
}
