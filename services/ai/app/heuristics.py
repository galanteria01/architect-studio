"""Heuristic implementations used when no AI provider key is configured.

Mirrors the client-side `lib/advisor.ts` so the product is fully functional
offline. When a provider is available the LLM output is used instead.
"""

from __future__ import annotations

import re
import uuid

from .catalog import get_spec
from .models import (
    AIGraphSpec,
    GenerateResponse,
    InterviewEvaluation,
    InterviewQuestion,
    OptimizationAction,
    OptimizationSuggestion,
    OptimizeResponse,
    ReviewResponse,
    ReviewScores,
)
from .templates import TEMPLATES

GENERIC_RUBRIC = [
    "Clear request flow from client to datastore",
    "Caching for hot reads",
    "Horizontal scalability behind a load balancer",
    "Redundant datastores (no single point of failure)",
    "Async processing for slow/non-critical work",
    "Observability and a CDN where appropriate",
]

INTERVIEW_PROMPTS = [
    "Design YouTube - a video sharing platform.",
    "Design Twitter - a social timeline at scale.",
    "Design Uber - real-time ride matching.",
    "Design a URL shortener (like bit.ly).",
    "Design WhatsApp - realtime messaging.",
    "Design a distributed rate limiter.",
    "Design Dropbox - file sync and storage.",
]


def _clamp(n: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, n))


def _parse_scale(p: str) -> int:
    match = re.search(r"(\d+(?:\.\d+)?)\s*([mk]?)", p)
    if not match:
        return 100_000
    n = float(match.group(1))
    unit = match.group(2)
    if unit == "m":
        n *= 1_000_000
    elif unit == "k":
        n *= 1_000
    return int(n) or 100_000


def _format_scale(n: int) -> str:
    if n >= 1_000_000:
        return f"{n // 1_000_000}M"
    if n >= 1_000:
        return f"{n // 1_000}K"
    return str(n)


def heuristic_generate(prompt: str) -> GenerateResponse:
    p = prompt.lower()
    scale = _parse_scale(p)

    key = "scalable-web"
    if re.search(r"rag|llm|chatbot|\bai\b|embedding|vector|agent", p):
        key = "rag-ai"
    elif re.search(r"instagram|feed|social|video|photo|stream|youtube|tiktok", p):
        key = "social-feed"
    elif re.search(r"simple|crud|blog|todo|small", p):
        key = "simple-web"

    spec = TEMPLATES[key].model_copy(deep=True)

    boost = 6 if scale >= 50_000_000 else 4 if scale >= 5_000_000 else 2 if scale >= 500_000 else 1
    cost = 0.0
    for node in spec.nodes:
        c = get_spec(node.type)
        if not c:
            continue
        replicas = boost if c.category in ("compute", "database") or node.type == "redis" else 1
        cost += c.cost * replicas

    requirements = [
        f"Support ~{_format_scale(scale)} users with low-latency reads.",
        "Horizontal scalability for stateless services behind a load balancer.",
        "High availability with redundant datastores (no single point of failure).",
        "Caching for hot reads and a CDN for static/media assets.",
        "Asynchronous processing for non-critical, slow work.",
        f'Original prompt: "{prompt.strip()}"',
    ]
    notes = (
        f'Heuristic design ("{key}" pattern) scaled for ~{_format_scale(scale)} users. '
        "Set an AI provider key for a model-generated, requirement-specific design."
    )
    return GenerateResponse(
        requirements=requirements,
        architecture=spec,
        costEstimate=round(cost),
        notes=notes,
        fallback=True,
    )


def _node_types(graph: AIGraphSpec) -> list[str]:
    return [n.type for n in graph.nodes]


def heuristic_review(graph: AIGraphSpec) -> ReviewResponse:
    types = _node_types(graph)
    specs = [get_spec(t) for t in types]
    specs = [s for s in specs if s]

    def has(pred) -> bool:
        return any(pred(t) for t in types)

    has_cache = "redis" in types
    has_cdn = "cdn" in types
    has_lb = any(get_spec(t) and get_spec(t).category == "networking" for t in types)
    has_queue = any(get_spec(t) and get_spec(t).category == "messaging" for t in types)
    has_obs = any(get_spec(t) and get_spec(t).category == "observability" for t in types)
    dbs = [t for t in types if get_spec(t) and get_spec(t).is_persistence]

    cost_total = sum(s.cost for s in specs) or 1
    scalability = _clamp(40 + (20 if has_lb else 0) + (15 if has_cache else 0) + (15 if has_queue else 0))
    reliability = _clamp(55 + (10 if len(dbs) > 1 else 0) - (15 if len(dbs) == 1 else 0))
    performance = _clamp(50 + (20 if has_cache else 0) + (15 if has_cdn else 0))
    cost = _clamp(90 - (len(str(int(cost_total))) * 8))
    maintainability = _clamp(60 + (20 if has_obs else 0) - max(0, len(types) - 15) * 2)

    scores = ReviewScores(
        scalability=scalability,
        reliability=reliability,
        performance=performance,
        cost=cost,
        maintainability=maintainability,
    )
    overall = round((scalability + reliability + performance + cost + maintainability) / 5)

    strengths: list[str] = []
    if has_cache:
        strengths.append("Uses a cache to reduce datastore load and latency.")
    if has_cdn:
        strengths.append("CDN offloads static/edge traffic from the origin.")
    if has_queue:
        strengths.append("Async messaging decouples slow work from the request path.")
    if has_obs:
        strengths.append("Observability is in place.")
    if not strengths:
        strengths.append("A clear request path is defined.")

    weaknesses: list[str] = []
    if not has_cache:
        weaknesses.append("No cache layer - reads hit the database directly.")
    if not has_obs:
        weaknesses.append("No observability (metrics/logging/tracing).")
    if len(dbs) == 1:
        weaknesses.append("Single datastore instance is a single point of failure.")

    suggestions: list[str] = []
    if not has_cache:
        suggestions.append("Add a Redis cache in front of the primary database.")
    if not has_cdn and has(lambda t: get_spec(t) and get_spec(t).is_client):
        suggestions.append("Put a CDN in front of static assets.")
    if len(dbs) == 1:
        suggestions.append("Add read replicas / standby for the datastore.")

    return ReviewResponse(
        scores=scores,
        overall=overall,
        summary=f"Overall {overall}/100. Estimated cost {round(cost_total):,} USD/mo.",
        strengths=strengths,
        weaknesses=weaknesses,
        suggestions=suggestions,
        fallback=True,
    )


def heuristic_optimize(graph: AIGraphSpec) -> OptimizeResponse:
    types = {n.id: n.type for n in graph.nodes}
    suggestions: list[OptimizationSuggestion] = []
    has_cache = "redis" in types.values()
    has_cdn = "cdn" in types.values()
    has_client = any(get_spec(t) and get_spec(t).is_client for t in types.values())
    dbs = [nid for nid, t in types.items() if get_spec(t) and get_spec(t).is_persistence and t != "redis"]

    if not has_cache and dbs:
        suggestions.append(
            OptimizationSuggestion(
                id=str(uuid.uuid4()),
                title="Add a cache layer",
                description="Insert Redis in front of your database to absorb reads and cut latency.",
                action=OptimizationAction(kind="add-cache", target=dbs[0]),
            )
        )
    if not has_cdn and has_client:
        suggestions.append(
            OptimizationSuggestion(
                id=str(uuid.uuid4()),
                title="Add a CDN",
                description="Serve static assets from the edge to offload origin traffic.",
                action=OptimizationAction(kind="add-cdn"),
            )
        )
    for db in dbs:
        suggestions.append(
            OptimizationSuggestion(
                id=str(uuid.uuid4()),
                title=f"Replicate {types[db]}",
                description="Add replicas to remove the single point of failure and scale reads.",
                action=OptimizationAction(kind="add-replica", target=db),
            )
        )

    return OptimizeResponse(suggestions=suggestions, fallback=True)


def heuristic_interview_question(topic: str | None) -> InterviewQuestion:
    import random

    question = f"Design {topic}." if topic else random.choice(INTERVIEW_PROMPTS)
    return InterviewQuestion(question=question, topic=topic or "system-design", rubric=GENERIC_RUBRIC)


def heuristic_interview_evaluate(question: str, graph: AIGraphSpec) -> InterviewEvaluation:
    review = heuristic_review(graph)
    types = _node_types(graph)

    def has(pred) -> bool:
        return any(pred(get_spec(t)) for t in types if get_spec(t))

    checks = [
        (has(lambda s: s.is_client), "Defined a client entry point"),
        (has(lambda s: s.category == "networking"), "Added a load balancer / gateway"),
        ("redis" in types, "Included a cache"),
        (has(lambda s: s.is_persistence), "Included a persistence layer"),
        (has(lambda s: s.category == "messaging"), "Used async messaging"),
        (has(lambda s: s.category == "observability"), "Added observability"),
    ]
    good = [label for ok, label in checks if ok]
    missing = [label for ok, label in checks if not ok]
    feedback = (
        f'For "{question}", your design scores {review.overall}/100. '
        + ("Consider addressing: " + ", ".join(missing) + "." if missing else "Strong coverage of the core concerns.")
    )
    return InterviewEvaluation(
        score=review.overall, feedback=feedback, good=good, missing=missing, fallback=True
    )
