import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Gauge } from "lucide-react";
import { useMetrics } from "@/hooks/useMetrics";
import { MetricCard } from "./MetricCard";
import { CostReport } from "./CostReport";

const AXIS = { stroke: "var(--color-muted-foreground)", fontSize: 10 };

function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-2 py-1.5 text-xs shadow-md">
      <p className="mb-0.5 text-muted-foreground">t+{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="tabular-nums">
          {p.name}: {Math.round(p.value)}
          {unit}
        </p>
      ))}
    </div>
  );
}

export function MetricsDashboard() {
  const { cards, timeline, result } = useMetrics();

  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <Gauge className="mb-2 size-7 opacity-50" />
        <p className="text-sm font-medium">No metrics yet</p>
        <p className="text-xs">Press Run to simulate traffic and see live metrics.</p>
      </div>
    );
  }

  const data = timeline.map((s, i) => ({
    i,
    latency: s.latencyMs,
    p95: s.p95,
    p99: s.p99,
    throughput: s.throughputRps,
    error: s.errorRate * 100,
  }));

  return (
    <div className="h-full overflow-auto p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {cards.map((c) => (
          <MetricCard key={c.key} card={c} />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Latency (ms)</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="i" {...AXIS} tickLine={false} />
              <YAxis {...AXIS} tickLine={false} width={36} />
              <Tooltip content={<ChartTooltip unit="ms" />} />
              <Line type="monotone" dataKey="latency" name="avg" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="p95" name="p95" stroke="#fbbf24" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="p99" name="p99" stroke="#f472b6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Throughput (rps)</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="tp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="i" {...AXIS} tickLine={false} />
              <YAxis {...AXIS} tickLine={false} width={36} />
              <Tooltip content={<ChartTooltip unit="" />} />
              <Area type="monotone" dataKey="throughput" name="rps" stroke="#34d399" strokeWidth={2} fill="url(#tp)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Error rate (%)</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="err" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="i" {...AXIS} tickLine={false} />
              <YAxis {...AXIS} tickLine={false} width={36} domain={[0, "auto"]} />
              <Tooltip content={<ChartTooltip unit="%" />} />
              <Area type="monotone" dataKey="error" name="err" stroke="#ef4444" strokeWidth={2} fill="url(#err)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <CostReport />
    </div>
  );
}
