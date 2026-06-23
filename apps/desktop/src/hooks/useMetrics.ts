import { useMemo } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import {
  formatAvailability,
  formatCost,
  formatLatency,
  formatPercent,
  formatRps,
} from "@/lib/format";

export interface MetricCard {
  key: string;
  label: string;
  value: string;
  tone: "default" | "good" | "warn" | "bad";
}

export function useMetrics() {
  const result = useSimulationStore((s) => s.result);
  const timeline = useSimulationStore((s) => s.timeline);

  const cards = useMemo<MetricCard[]>(() => {
    if (!result) return [];
    const errTone =
      result.errorRate > 0.05 ? "bad" : result.errorRate > 0.005 ? "warn" : "good";
    const availTone =
      result.availability >= 0.999
        ? "good"
        : result.availability >= 0.99
          ? "warn"
          : "bad";
    return [
      { key: "latency", label: "Avg Latency", value: formatLatency(result.meanLatencyMs), tone: "default" },
      { key: "p95", label: "P95", value: formatLatency(result.p95), tone: "default" },
      { key: "p99", label: "P99", value: formatLatency(result.p99), tone: "default" },
      { key: "throughput", label: "Throughput", value: formatRps(result.throughputRps), tone: "default" },
      { key: "availability", label: "Availability", value: formatAvailability(result.availability), tone: availTone },
      { key: "error", label: "Error Rate", value: formatPercent(result.errorRate, 2), tone: errTone },
      { key: "cost", label: "Monthly Cost", value: formatCost(result.monthlyCost), tone: "default" },
      { key: "bottlenecks", label: "Bottlenecks", value: String(result.bottlenecks.length), tone: result.bottlenecks.length ? "warn" : "good" },
    ];
  }, [result]);

  return { result, timeline, cards };
}
