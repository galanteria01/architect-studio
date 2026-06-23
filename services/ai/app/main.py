"""Architect Studio AI sidecar - FastAPI app.

Exposes architecture generation, review, optimization, and interview endpoints.
Each endpoint tries a configured LLM provider and transparently falls back to a
deterministic heuristic engine when no key is set or the model output is invalid.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import heuristics, providers
from .catalog import VALID_TYPES, get_spec
from .models import (
    AIGraphEdge,
    AIGraphNode,
    AIGraphSpec,
    GenerateRequest,
    GenerateResponse,
    GraphRequest,
    HealthResponse,
    InterviewEvaluateRequest,
    InterviewEvaluation,
    InterviewQuestion,
    InterviewQuestionRequest,
    OptimizeResponse,
    ReviewResponse,
    ReviewScores,
)

app = FastAPI(title="Architect Studio AI", version="0.1.0")

# The desktop app talks to us via the Tauri HTTP plugin; allow the dev origin too.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_TYPES_STR = ", ".join(sorted(VALID_TYPES))


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        providers=providers.available_providers(),
        model=providers.active_model(),
    )


def _graph_from_dict(raw: dict) -> AIGraphSpec:
    nodes = []
    seen = set()
    for n in raw.get("nodes", []):
        t = n.get("type")
        if t in VALID_TYPES and n.get("id") not in seen:
            seen.add(n.get("id"))
            nodes.append(AIGraphNode(id=str(n.get("id")), type=t, label=n.get("label")))
    valid_ids = {n.id for n in nodes}
    edges = [
        AIGraphEdge(source=str(e["source"]), target=str(e["target"]))
        for e in raw.get("edges", [])
        if e.get("source") in valid_ids and e.get("target") in valid_ids
    ]
    return AIGraphSpec(nodes=nodes, edges=edges)


def _estimate_cost(graph: AIGraphSpec) -> float:
    total = 0.0
    for n in graph.nodes:
        spec = get_spec(n.type)
        if spec:
            total += spec.cost
    return round(total)


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    system = (
        "You are a senior systems architect. Given a product brief, return STRICT JSON only "
        "with keys: requirements (string array), notes (string), and architecture "
        '({"nodes":[{"id":"string","type":"string"}],"edges":[{"source":"id","target":"id"}]}). '
        f"Each node type MUST be one of: {VALID_TYPES_STR}. Build a realistic, scalable design "
        "with a clear client -> edge -> service -> data flow."
    )
    data = await providers.complete_json(system, req.prompt)
    if data and isinstance(data.get("architecture"), dict):
        graph = _graph_from_dict(data["architecture"])
        if graph.nodes:
            return GenerateResponse(
                requirements=[str(r) for r in data.get("requirements", [])][:10] or ["Derived from prompt."],
                architecture=graph,
                costEstimate=_estimate_cost(graph),
                notes=str(data.get("notes", "")),
                fallback=False,
            )
    return heuristics.heuristic_generate(req.prompt)


@app.post("/review", response_model=ReviewResponse)
async def review(req: GraphRequest) -> ReviewResponse:
    system = (
        "You are a principal engineer reviewing a system architecture. Return STRICT JSON only with "
        "keys: scores ({scalability,reliability,performance,cost,maintainability} each 0-100), "
        "overall (0-100), summary (string), strengths (string[]), weaknesses (string[]), "
        "suggestions (string[])."
    )
    user = "Architecture graph (component types and edges):\n" + req.graph.model_dump_json()
    data = await providers.complete_json(system, user)
    try:
        if data and isinstance(data.get("scores"), dict):
            scores = ReviewScores(**data["scores"])
            return ReviewResponse(
                scores=scores,
                overall=float(data.get("overall", 0)),
                summary=str(data.get("summary", "")),
                strengths=[str(s) for s in data.get("strengths", [])],
                weaknesses=[str(s) for s in data.get("weaknesses", [])],
                suggestions=[str(s) for s in data.get("suggestions", [])],
                fallback=False,
            )
    except Exception:
        pass
    return heuristics.heuristic_review(req.graph)


@app.post("/optimize", response_model=OptimizeResponse)
async def optimize(req: GraphRequest) -> OptimizeResponse:
    # Structured actions are reliably produced by the heuristic engine.
    return heuristics.heuristic_optimize(req.graph)


@app.post("/interview/question", response_model=InterviewQuestion)
async def interview_question(req: InterviewQuestionRequest) -> InterviewQuestion:
    return heuristics.heuristic_interview_question(req.topic)


@app.post("/interview/evaluate", response_model=InterviewEvaluation)
async def interview_evaluate(req: InterviewEvaluateRequest) -> InterviewEvaluation:
    system = (
        "You are a system design interviewer. Given the question and the candidate's architecture "
        "graph, return STRICT JSON only with keys: score (0-100), feedback (string), "
        "good (string[]), missing (string[])."
    )
    user = f"Question: {req.question}\nCandidate graph: {req.graph.model_dump_json()}"
    data = await providers.complete_json(system, user)
    try:
        if data and "score" in data:
            return InterviewEvaluation(
                score=float(data["score"]),
                feedback=str(data.get("feedback", "")),
                good=[str(s) for s in data.get("good", [])],
                missing=[str(s) for s in data.get("missing", [])],
                fallback=False,
            )
    except Exception:
        pass
    return heuristics.heuristic_interview_evaluate(req.question, req.graph)
