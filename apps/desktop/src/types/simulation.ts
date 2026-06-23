import type { NodeStatus } from "./node";

/** Inputs that drive a simulation run. */
export interface SimulationParams {
  /** Offered load at the entry points, requests/sec. */
  rps: number;
  /** Fraction of requests that are reads (vs writes) in [0, 1]. */
  readRatio: number;
  /** Whether a failed region/component takes down dependent traffic. */
  cascadeFailures: boolean;
}

/** A single traced request path through the graph. */
export interface RequestPath {
  id: string;
  nodeIds: string[];
  edgeIds: string[];
  totalLatencyMs: number;
  ok: boolean;
  /** Node id where the request failed, if any. */
  failedAt?: string;
}

/** Per-node runtime stats produced by a simulation. */
export interface NodeRuntime {
  status: NodeStatus;
  utilization: number;
  inboundRps: number;
}

/** Aggregate output of a simulation run. */
export interface SimulationResult {
  /** Mean end-to-end latency across sampled paths, ms. */
  meanLatencyMs: number;
  p50: number;
  p95: number;
  p99: number;
  /** Effective system throughput (limited by the worst bottleneck), rps. */
  throughputRps: number;
  /** End-to-end availability as a fraction in [0, 1]. */
  availability: number;
  /** Total monthly cost in USD. */
  monthlyCost: number;
  /** Fraction of requests that failed in [0, 1]. */
  errorRate: number;
  /** Node ids that are saturated/over capacity. */
  bottlenecks: string[];
  /** Sampled request paths (a representative subset). */
  paths: RequestPath[];
  /** Per-node runtime stats keyed by node id. */
  perNode: Record<string, NodeRuntime>;
  timestamp: number;
}

/** A point in a streamed time-series shown in the metrics dashboard. */
export interface MetricSample {
  t: number;
  latencyMs: number;
  p95: number;
  p99: number;
  throughputRps: number;
  errorRate: number;
  availability: number;
  cost: number;
}
