import { create } from "zustand";
import type { MetricSample, SimulationParams, SimulationResult } from "@/types";
import { DEFAULT_SIM_PARAMS, simulate } from "@/lib/metrics";
import { useCanvasStore } from "./canvas-store";

const MAX_SAMPLES = 60;
let timer: ReturnType<typeof setInterval> | null = null;

function jitter(value: number, pct = 0.08): number {
  const delta = value * pct;
  return Math.max(0, value + (Math.random() * 2 - 1) * delta);
}

interface SimulationState {
  params: SimulationParams;
  result: SimulationResult | null;
  timeline: MetricSample[];
  running: boolean;
  /** Whether request-packet animation should play on the canvas. */
  animate: boolean;

  setParams: (patch: Partial<SimulationParams>) => void;
  setAnimate: (animate: boolean) => void;
  runOnce: () => SimulationResult;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

function pushSample(
  timeline: MetricSample[],
  result: SimulationResult,
  live: boolean,
): MetricSample[] {
  const sample: MetricSample = {
    t: result.timestamp,
    latencyMs: live ? jitter(result.meanLatencyMs) : result.meanLatencyMs,
    p95: live ? jitter(result.p95) : result.p95,
    p99: live ? jitter(result.p99) : result.p99,
    throughputRps: live ? jitter(result.throughputRps) : result.throughputRps,
    errorRate: result.errorRate,
    availability: result.availability,
    cost: result.monthlyCost,
  };
  return [...timeline, sample].slice(-MAX_SAMPLES);
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  params: DEFAULT_SIM_PARAMS,
  result: null,
  timeline: [],
  running: false,
  animate: true,

  setParams: (patch) => {
    set((s) => ({ params: { ...s.params, ...patch } }));
    if (get().result) get().runOnce();
  },

  setAnimate: (animate) => set({ animate }),

  runOnce: () => {
    const { nodes, edges } = useCanvasStore.getState();
    const result = simulate(nodes, edges, get().params);
    const activeEdges = result.paths.filter((p) => p.ok).flatMap((p) => p.edgeIds);
    useCanvasStore.getState().applyRuntime(result.perNode, activeEdges);
    set((s) => ({
      result,
      timeline: pushSample(s.timeline, result, s.running),
    }));
    return result;
  },

  start: () => {
    if (timer) return;
    set({ running: true });
    get().runOnce();
    timer = setInterval(() => {
      get().runOnce();
    }, 1000);
  },

  stop: () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    set({ running: false });
  },

  reset: () => {
    get().stop();
    useCanvasStore.getState().resetRuntime();
    set({ result: null, timeline: [] });
  },
}));
