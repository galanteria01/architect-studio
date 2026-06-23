/** Simplified graph schema exchanged with the AI service. */
export interface AIGraphNode {
  id: string;
  type: string;
  label?: string;
  region?: string;
  x?: number;
  y?: number;
}

export interface AIGraphEdge {
  source: string;
  target: string;
  protocol?: string;
}

export interface AIGraphSpec {
  nodes: AIGraphNode[];
  edges: AIGraphEdge[];
}

export interface GenerateResponse {
  requirements: string[];
  architecture: AIGraphSpec;
  costEstimate: number;
  notes: string;
  /** True when produced by a heuristic fallback (no model/key configured). */
  fallback?: boolean;
}

export interface ReviewScores {
  scalability: number;
  reliability: number;
  performance: number;
  cost: number;
  maintainability: number;
}

export interface ReviewResponse {
  scores: ReviewScores;
  overall: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  fallback?: boolean;
}

export interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  /** Operation the client can apply automatically. */
  action:
    | { kind: "add-cache"; target: string }
    | { kind: "add-replica"; target: string }
    | { kind: "shard-database"; target: string }
    | { kind: "add-cdn" }
    | { kind: "none" };
}

export interface OptimizeResponse {
  suggestions: OptimizationSuggestion[];
  fallback?: boolean;
}

export interface InterviewQuestion {
  question: string;
  topic: string;
  rubric: string[];
}

export interface InterviewEvaluation {
  score: number;
  feedback: string;
  missing: string[];
  good: string[];
  fallback?: boolean;
}

export interface HealthResponse {
  status: string;
  providers: { openai: boolean; anthropic: boolean; gemini: boolean };
  model: string | null;
}
