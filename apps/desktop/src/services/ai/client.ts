import type { ArchitectureGraph } from "@/types";
import { isTauri } from "@/services/storage";
import { toAIGraph } from "./convert";
import type {
  GenerateResponse,
  HealthResponse,
  InterviewEvaluation,
  InterviewQuestion,
  OptimizeResponse,
  ReviewResponse,
} from "./types";

const BASE_URL = "http://localhost:8008";

/** Use Tauri's HTTP plugin inside the app (bypasses CORS), fetch in the browser. */
async function httpFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  if (isTauri()) {
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
    return tauriFetch(input, init);
  }
  return fetch(input, init);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await httpFetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export const aiClient = {
  async health(): Promise<HealthResponse> {
    const res = await httpFetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`health ${res.status}`);
    return res.json() as Promise<HealthResponse>;
  },

  async isReachable(timeoutMs = 1500): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await httpFetch(`${BASE_URL}/health`, { signal: ctrl.signal });
      clearTimeout(t);
      return res.ok;
    } catch {
      return false;
    }
  },

  generate(prompt: string): Promise<GenerateResponse> {
    return post<GenerateResponse>("/generate", { prompt });
  },

  review(graph: ArchitectureGraph): Promise<ReviewResponse> {
    return post<ReviewResponse>("/review", { graph: toAIGraph(graph) });
  },

  optimize(graph: ArchitectureGraph): Promise<OptimizeResponse> {
    return post<OptimizeResponse>("/optimize", { graph: toAIGraph(graph) });
  },

  interviewQuestion(topic?: string): Promise<InterviewQuestion> {
    return post<InterviewQuestion>("/interview/question", { topic });
  },

  interviewEvaluate(
    question: string,
    graph: ArchitectureGraph,
  ): Promise<InterviewEvaluation> {
    return post<InterviewEvaluation>("/interview/evaluate", {
      question,
      graph: toAIGraph(graph),
    });
  },
};
