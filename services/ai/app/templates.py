"""Server-side architecture templates for the heuristic generator."""

from __future__ import annotations

from .models import AIGraphEdge, AIGraphNode, AIGraphSpec


def _build(nodes: list[tuple[str, str]], links: list[tuple[str, str]]) -> AIGraphSpec:
    """nodes: list of (ref, type); links: list of (ref, ref)."""
    return AIGraphSpec(
        nodes=[AIGraphNode(id=ref, type=t) for ref, t in nodes],
        edges=[AIGraphEdge(source=a, target=b) for a, b in links],
    )


TEMPLATES: dict[str, AIGraphSpec] = {
    "simple-web": _build(
        [("user", "user"), ("lb", "load-balancer"), ("api", "microservice"), ("db", "postgresql")],
        [("user", "lb"), ("lb", "api"), ("api", "db")],
    ),
    "scalable-web": _build(
        [
            ("user", "user"),
            ("cdn", "cdn"),
            ("gw", "api-gateway"),
            ("svc", "microservice"),
            ("cache", "redis"),
            ("db", "postgresql"),
            ("queue", "kafka"),
            ("worker", "worker"),
        ],
        [
            ("user", "cdn"),
            ("user", "gw"),
            ("gw", "svc"),
            ("svc", "cache"),
            ("svc", "db"),
            ("svc", "queue"),
            ("queue", "worker"),
            ("worker", "db"),
        ],
    ),
    "social-feed": _build(
        [
            ("mobile", "mobile-app"),
            ("cdn", "cdn"),
            ("gw", "api-gateway"),
            ("feed", "microservice"),
            ("cache", "redis"),
            ("db", "cassandra"),
            ("media", "object-storage"),
            ("queue", "kafka"),
            ("notif", "notification-service"),
        ],
        [
            ("mobile", "cdn"),
            ("mobile", "gw"),
            ("gw", "feed"),
            ("feed", "cache"),
            ("feed", "db"),
            ("feed", "media"),
            ("cdn", "media"),
            ("feed", "queue"),
            ("queue", "notif"),
        ],
    ),
    "rag-ai": _build(
        [
            ("user", "user"),
            ("gw", "api-gateway"),
            ("agent", "agent"),
            ("embed", "embedding-service"),
            ("vdb", "vector-database"),
            ("rerank", "reranker"),
            ("llm", "llm"),
            ("cache", "redis"),
        ],
        [
            ("user", "gw"),
            ("gw", "agent"),
            ("agent", "embed"),
            ("embed", "vdb"),
            ("vdb", "rerank"),
            ("agent", "llm"),
            ("agent", "cache"),
        ],
    ),
}
