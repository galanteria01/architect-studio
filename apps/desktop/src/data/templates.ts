import type { ArchitectureEdge, ArchitectureGraph, Template } from "@/types";
import { createArchitectureNode } from "@/lib/node-factory";
import { uid } from "@/lib/id";

interface NodeSeed {
  ref: string;
  type: string;
  x: number;
  y: number;
  overrides?: Parameters<typeof createArchitectureNode>[2];
}

function build(seeds: NodeSeed[], links: [string, string][]): ArchitectureGraph {
  const refMap = new Map<string, string>();
  const nodes = seeds.map((s) => {
    const node = createArchitectureNode(s.type, { x: s.x, y: s.y }, s.overrides);
    refMap.set(s.ref, node.id);
    return node;
  });
  const edges: ArchitectureEdge[] = links
    .filter(([a, b]) => refMap.has(a) && refMap.has(b))
    .map(([a, b]) => ({
      id: uid("edge"),
      source: refMap.get(a)!,
      target: refMap.get(b)!,
      type: "architecture",
      data: { latencyMs: 0, protocol: "HTTP", active: false },
    }));
  return { nodes, edges };
}

export const TEMPLATES: Template[] = [
  {
    key: "simple-web",
    name: "Simple Web App",
    category: "starter",
    description: "Classic 3-tier app: client, service, and a single database.",
    graph: build(
      [
        { ref: "user", type: "user", x: 0, y: 120 },
        { ref: "lb", type: "load-balancer", x: 260, y: 120 },
        { ref: "api", type: "microservice", x: 520, y: 120 },
        { ref: "db", type: "postgresql", x: 780, y: 120 },
      ],
      [
        ["user", "lb"],
        ["lb", "api"],
        ["api", "db"],
      ],
    ),
  },
  {
    key: "scalable-web",
    name: "Scalable Web Service",
    category: "starter",
    description: "CDN, gateway, cache, replicated DB, and async workers.",
    graph: build(
      [
        { ref: "user", type: "user", x: 0, y: 200 },
        { ref: "cdn", type: "cdn", x: 240, y: 80 },
        { ref: "gw", type: "api-gateway", x: 240, y: 280 },
        { ref: "svc", type: "microservice", x: 500, y: 280 },
        { ref: "cache", type: "redis", x: 760, y: 160 },
        { ref: "db", type: "postgresql", x: 760, y: 320 },
        { ref: "queue", type: "kafka", x: 500, y: 460 },
        { ref: "worker", type: "worker", x: 760, y: 460 },
      ],
      [
        ["user", "cdn"],
        ["user", "gw"],
        ["gw", "svc"],
        ["svc", "cache"],
        ["svc", "db"],
        ["svc", "queue"],
        ["queue", "worker"],
        ["worker", "db"],
      ],
    ),
  },
  {
    key: "social-feed",
    name: "Social Media Feed",
    category: "interview",
    description: "Instagram-style read-heavy feed with CDN, cache, and object storage.",
    graph: build(
      [
        { ref: "mobile", type: "mobile-app", x: 0, y: 220 },
        { ref: "cdn", type: "cdn", x: 220, y: 80 },
        { ref: "gw", type: "api-gateway", x: 220, y: 300 },
        { ref: "feed", type: "microservice", x: 460, y: 220 },
        { ref: "cache", type: "redis", x: 700, y: 120 },
        { ref: "db", type: "cassandra", x: 700, y: 280 },
        { ref: "media", type: "object-storage", x: 460, y: 440 },
        { ref: "queue", type: "kafka", x: 460, y: 40 },
        { ref: "notif", type: "notification-service", x: 700, y: 440 },
      ],
      [
        ["mobile", "cdn"],
        ["mobile", "gw"],
        ["gw", "feed"],
        ["feed", "cache"],
        ["feed", "db"],
        ["feed", "media"],
        ["cdn", "media"],
        ["feed", "queue"],
        ["queue", "notif"],
      ],
    ),
  },
  {
    key: "rag-ai",
    name: "RAG AI Application",
    category: "ai",
    description: "Retrieval-augmented generation with embeddings, vector DB, and an LLM.",
    graph: build(
      [
        { ref: "user", type: "user", x: 0, y: 200 },
        { ref: "gw", type: "api-gateway", x: 220, y: 200 },
        { ref: "agent", type: "agent", x: 440, y: 200 },
        { ref: "embed", type: "embedding-service", x: 660, y: 80 },
        { ref: "vdb", type: "vector-database", x: 880, y: 80 },
        { ref: "rerank", type: "reranker", x: 880, y: 240 },
        { ref: "llm", type: "llm", x: 660, y: 320 },
        { ref: "cache", type: "redis", x: 440, y: 360 },
      ],
      [
        ["user", "gw"],
        ["gw", "agent"],
        ["agent", "embed"],
        ["embed", "vdb"],
        ["vdb", "rerank"],
        ["agent", "llm"],
        ["agent", "cache"],
      ],
    ),
  },
];

export function getTemplate(key: string): Template | undefined {
  return TEMPLATES.find((t) => t.key === key);
}
