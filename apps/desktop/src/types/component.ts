/**
 * Component catalog types: the static library of infrastructure building blocks
 * that users drag onto the canvas.
 */

export const COMPONENT_CATEGORIES = [
  "client",
  "networking",
  "compute",
  "database",
  "messaging",
  "storage",
  "ai",
  "observability",
] as const;

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number];

/** Per-node performance + economic characteristics used by the simulation engine. */
export interface NodeMetrics {
  /** Service/processing latency added by this component, in milliseconds. */
  latencyMs: number;
  /** Sustained throughput a single instance can handle, requests/sec. */
  throughputRps: number;
  /** Hard capacity ceiling per instance before it becomes a bottleneck, requests/sec. */
  capacityRps: number;
  /** Availability of a single instance as a fraction in [0, 1] (e.g. 0.999). */
  availability: number;
  /** Estimated monthly cost in USD for a single instance. */
  costMonthly: number;
  /** Number of horizontal replicas (for redundancy + capacity). */
  replicas: number;
}

/** Educational metadata surfaced in Learning Mode. */
export interface LearningInfo {
  purpose: string;
  useCases: string[];
  tradeoffs: string[];
  interviewNotes: string[];
  companies: string[];
}

/** Behavioural flags the validators and simulator reason about. */
export interface ComponentCapabilities {
  /** Acts as a request origin (User, Mobile App, ...). */
  isClient: boolean;
  /** Persists data (databases, object storage, ...). */
  canPersist: boolean;
  /** Message broker / queue (Kafka, RabbitMQ, SQS). */
  isQueue: boolean;
  /** Can act as a consumer of a queue (workers, services). */
  isConsumer: boolean;
  /** Valid public entry point that may receive traffic directly from clients. */
  isPublicEntry: boolean;
}

/** A catalog entry describing one type of component. */
export interface ComponentSpec {
  type: string;
  label: string;
  category: ComponentCategory;
  /** lucide-react icon name. */
  icon: string;
  description: string;
  defaults: NodeMetrics;
  learning: LearningInfo;
  capabilities: ComponentCapabilities;
  tags: string[];
}
