import type {
  ArchitectureEdge,
  ArchitectureGraph,
  ArchitectureNode,
} from "@/types";
import type {
  OptimizationSuggestion,
  ReviewResponse,
} from "@/services/ai/types";
import { validateArchitecture } from "./validation";
import { simulate } from "./metrics";
import { isPersistence } from "./graph";
import { getTemplate } from "@/data/templates";
import { createArchitectureNode } from "./node-factory";
import { uid } from "./id";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Heuristic architecture review used when no AI provider is configured. */
export function localReview(graph: ArchitectureGraph): ReviewResponse {
  const { nodes, edges } = graph;
  const result = simulate(nodes, edges);
  const issues = validateArchitecture(nodes, edges, result);

  const has = (pred: (n: ArchitectureNode) => boolean) => nodes.some(pred);
  const hasCache = has((n) => n.data.componentType === "redis");
  const hasCdn = has((n) => n.data.componentType === "cdn");
  const hasLb = has((n) => n.data.category === "networking");
  const hasQueue = has((n) => n.data.category === "messaging");
  const hasObs = has((n) => n.data.category === "observability");
  const replicated = nodes.filter((n) => n.data.metrics.replicas > 1).length;
  const dbs = nodes.filter(isPersistence);

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;

  const scalability = clamp(
    40 + (hasLb ? 20 : 0) + (hasCache ? 15 : 0) + (hasQueue ? 15 : 0) + replicated * 5,
  );
  const reliability = clamp(
    50 + replicated * 8 - dbs.filter((d) => d.data.metrics.replicas <= 1).length * 15 - errors * 10,
  );
  const performance = clamp(
    50 + (hasCache ? 20 : 0) + (hasCdn ? 15 : 0) - result.bottlenecks.length * 8,
  );
  const cost = clamp(90 - Math.log10(Math.max(1, result.monthlyCost)) * 8);
  const maintainability = clamp(
    60 + (hasObs ? 20 : 0) - warnings * 5 - Math.max(0, nodes.length - 15) * 2,
  );

  const scores = { scalability, reliability, performance, cost, maintainability };
  const overall = Math.round(
    (scalability + reliability + performance + cost + maintainability) / 5,
  );

  const strengths: string[] = [];
  if (hasCache) strengths.push("Uses a cache to reduce datastore load and latency.");
  if (hasCdn) strengths.push("CDN offloads static/edge traffic from the origin.");
  if (hasQueue) strengths.push("Async messaging decouples slow work from the request path.");
  if (replicated) strengths.push(`${replicated} component(s) are horizontally replicated.`);
  if (hasObs) strengths.push("Observability is in place for monitoring.");
  if (strengths.length === 0) strengths.push("A clear request path is defined.");

  const weaknesses = issues.slice(0, 6).map((i) => i.message);
  if (!hasCache) weaknesses.push("No cache layer — reads hit the database directly.");
  if (!hasObs) weaknesses.push("No observability (metrics/logging/tracing).");

  const suggestions: string[] = [];
  if (!hasCache) suggestions.push("Add a Redis cache in front of the primary database.");
  if (dbs.some((d) => d.data.metrics.replicas <= 1))
    suggestions.push("Add read replicas / standby for single-instance datastores.");
  if (!hasCdn && has((n) => n.data.category === "client"))
    suggestions.push("Put a CDN in front of static assets.");
  if (result.bottlenecks.length)
    suggestions.push("Scale or shard the bottleneck components flagged by the simulator.");

  return {
    scores,
    overall,
    summary: `Overall ${overall}/100. ${errors} error(s), ${warnings} warning(s). Estimated cost ${Math.round(
      result.monthlyCost,
    ).toLocaleString()} USD/mo.`,
    strengths,
    weaknesses: weaknesses.slice(0, 6),
    suggestions,
    fallback: true,
  };
}

/** Heuristic optimization suggestions used when no AI provider is configured. */
export function localOptimize(graph: ArchitectureGraph): OptimizationSuggestion[] {
  const { nodes, edges } = graph;
  const result = simulate(nodes, edges);
  const suggestions: OptimizationSuggestion[] = [];

  const dbs = nodes.filter(isPersistence);
  const hasCache = nodes.some((n) => n.data.componentType === "redis");
  const hasCdn = nodes.some((n) => n.data.componentType === "cdn");
  const hasClient = nodes.some((n) => n.data.category === "client");

  if (!hasCache && dbs.length > 0) {
    suggestions.push({
      id: uid("opt"),
      title: "Add a cache layer",
      description: "Insert Redis in front of your database to absorb read traffic and cut latency.",
      action: { kind: "add-cache", target: dbs[0].id },
    });
  }
  if (!hasCdn && hasClient) {
    suggestions.push({
      id: uid("opt"),
      title: "Add a CDN",
      description: "Serve static assets from the edge to offload origin traffic and reduce latency.",
      action: { kind: "add-cdn" },
    });
  }
  for (const db of dbs) {
    if (db.data.metrics.replicas <= 1) {
      suggestions.push({
        id: uid("opt"),
        title: `Replicate ${db.data.label}`,
        description: `${db.data.label} is a single point of failure. Add replicas for HA and read scaling.`,
        action: { kind: "add-replica", target: db.id },
      });
    }
  }
  for (const id of result.bottlenecks) {
    const node = nodes.find((n) => n.id === id);
    if (node && node.data.metrics.replicas <= 3 && !isPersistence(node)) {
      suggestions.push({
        id: uid("opt"),
        title: `Scale ${node.data.label}`,
        description: `${node.data.label} is a bottleneck at current load. Add replicas to increase capacity.`,
        action: { kind: "add-replica", target: node.id },
      });
    }
  }
  const bigDb = dbs.find((d) => d.data.inboundRps > d.data.metrics.capacityRps);
  if (bigDb) {
    suggestions.push({
      id: uid("opt"),
      title: `Shard ${bigDb.data.label}`,
      description: `${bigDb.data.label} is over capacity. Shard it to distribute writes across nodes.`,
      action: { kind: "shard-database", target: bigDb.id },
    });
  }

  return suggestions;
}

export interface LocalGenerateResult {
  graph: ArchitectureGraph;
  requirements: string[];
  notes: string;
  cost: number;
}

/** Heuristic architecture generator used when no AI provider is configured. */
export function localGenerate(prompt: string): LocalGenerateResult {
  const p = prompt.toLowerCase();
  const scale = parseScale(p);

  let templateKey = "scalable-web";
  if (/(rag|llm|chatbot|\bai\b|embedding|vector|agent)/.test(p)) templateKey = "rag-ai";
  else if (/(instagram|feed|social|video|photo|stream|youtube|tiktok)/.test(p)) templateKey = "social-feed";
  else if (/(simple|crud|blog|todo|small)/.test(p)) templateKey = "simple-web";

  const template = getTemplate(templateKey)!;
  const graph: ArchitectureGraph = structuredClone(template.graph);

  // Scale replicas with the requested load.
  const replicaBoost = scale >= 50_000_000 ? 6 : scale >= 5_000_000 ? 4 : scale >= 500_000 ? 2 : 1;
  for (const n of graph.nodes) {
    if (n.data.category === "compute" || isPersistence(n) || n.data.componentType === "redis") {
      n.data.metrics = { ...n.data.metrics, replicas: Math.max(n.data.metrics.replicas, replicaBoost) };
    }
  }

  const cost = graph.nodes.reduce(
    (s, n) => s + n.data.metrics.costMonthly * Math.max(1, n.data.metrics.replicas),
    0,
  );

  const requirements = buildRequirements(prompt, scale);
  const notes =
    `Heuristic design based on the "${template.name}" pattern, scaled for ~${formatScale(scale)} users. ` +
    `Connect an AI provider in the sidecar for a model-generated, requirement-specific design.`;

  return { graph, requirements, notes, cost };
}

function parseScale(p: string): number {
  const match = p.match(/(\d+(?:\.\d+)?)\s*([mk]?)\s*(?:dau|mau|users|requests|qps|rps)?/);
  if (!match) return 100_000;
  let n = parseFloat(match[1]);
  if (match[2] === "m") n *= 1_000_000;
  else if (match[2] === "k") n *= 1_000;
  return n || 100_000;
}

function formatScale(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function buildRequirements(prompt: string, scale: number): string[] {
  return [
    `Support ~${formatScale(scale)} users with low-latency reads.`,
    "Horizontal scalability for stateless services behind a load balancer.",
    "High availability with redundant datastores (no single point of failure).",
    "Caching for hot reads and a CDN for static/media assets.",
    "Asynchronous processing for non-critical, slow work.",
    `Original prompt: "${prompt.trim()}"`,
  ];
}

const INTERVIEW_PROMPTS = [
  "Design YouTube — a video sharing platform.",
  "Design Twitter — a social timeline at scale.",
  "Design Uber — real-time ride matching.",
  "Design a URL shortener (like bit.ly).",
  "Design WhatsApp — realtime messaging.",
  "Design a distributed rate limiter.",
  "Design Dropbox — file sync and storage.",
  "Design Instagram — a photo feed for 50M DAU.",
];

const GENERIC_RUBRIC = [
  "Clear request flow from client to datastore",
  "Caching for hot reads",
  "Horizontal scalability behind a load balancer",
  "Redundant datastores (no single point of failure)",
  "Async processing for slow/non-critical work",
  "Observability and a CDN where appropriate",
];

export function localInterviewQuestion(topic?: string) {
  const question = topic
    ? `Design ${topic}.`
    : INTERVIEW_PROMPTS[Math.floor(Math.random() * INTERVIEW_PROMPTS.length)];
  return { question, topic: topic ?? "system-design", rubric: GENERIC_RUBRIC };
}

export function localInterviewEvaluate(question: string, graph: ArchitectureGraph) {
  const review = localReview(graph);
  const has = (pred: (n: ArchitectureNode) => boolean) => graph.nodes.some(pred);
  const good: string[] = [];
  const missing: string[] = [];

  const checks: [boolean, string][] = [
    [has((n) => n.data.category === "client"), "Defined a client entry point"],
    [has((n) => n.data.category === "networking"), "Added a load balancer / gateway"],
    [has((n) => n.data.componentType === "redis"), "Included a cache"],
    [has(isPersistence), "Included a persistence layer"],
    [has((n) => n.data.category === "messaging"), "Used async messaging"],
    [has((n) => n.data.category === "observability"), "Added observability"],
  ];
  for (const [ok, label] of checks) (ok ? good : missing).push(label);

  const score = review.overall;
  const feedback =
    `For "${question}", your design scores ${score}/100. ` +
    (missing.length
      ? `Consider addressing: ${missing.join(", ")}.`
      : "Strong coverage of the core system design concerns.");

  return { score, feedback, good, missing, fallback: true };
}

/** Apply an optimization suggestion to a graph, returning new nodes/edges. */
export function applyOptimization(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  suggestion: OptimizationSuggestion,
): { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] } {
  const action = suggestion.action;
  let nextNodes = [...nodes];
  let nextEdges = [...edges];

  const bump = (id: string, by = 2) =>
    (nextNodes = nextNodes.map((n) =>
      n.id === id
        ? { ...n, data: { ...n.data, metrics: { ...n.data.metrics, replicas: n.data.metrics.replicas + by } } }
        : n,
    ));

  if (action.kind === "add-replica" || action.kind === "shard-database") {
    bump(action.target, action.kind === "shard-database" ? 3 : 2);
  } else if (action.kind === "add-cache") {
    const target = nodes.find((n) => n.id === action.target);
    const pos = target ? { x: target.position.x - 40, y: target.position.y - 140 } : { x: 200, y: 0 };
    const cache = createArchitectureNode("redis", pos);
    nextNodes = [...nextNodes, cache];
    // Wire upstream callers of the DB through the cache.
    const callers = edges.filter((e) => e.target === action.target).map((e) => e.source);
    for (const caller of callers) {
      nextEdges = [
        ...nextEdges,
        { id: uid("edge"), source: caller, target: cache.id, type: "architecture", data: { latencyMs: 0, protocol: "HTTP", active: false } },
      ];
    }
  } else if (action.kind === "add-cdn") {
    const client = nodes.find((n) => n.data.category === "client");
    const pos = client ? { x: client.position.x + 200, y: client.position.y - 120 } : { x: 200, y: 0 };
    const cdn = createArchitectureNode("cdn", pos);
    nextNodes = [...nextNodes, cdn];
    if (client) {
      nextEdges = [
        ...nextEdges,
        { id: uid("edge"), source: client.id, target: cdn.id, type: "architecture", data: { latencyMs: 0, protocol: "HTTP", active: false } },
      ];
    }
  }

  return { nodes: nextNodes, edges: nextEdges };
}
