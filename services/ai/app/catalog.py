"""Compact server-side component catalog (mirrors the TS component library).

Used for cost estimation and heuristic scoring when no AI provider is set.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Spec:
    category: str
    latency: float
    capacity: float
    availability: float
    cost: float
    is_client: bool = False
    is_persistence: bool = False
    is_queue: bool = False
    is_consumer: bool = False


CATALOG: dict[str, Spec] = {
    # client
    "user": Spec("client", 0, 1e9, 1.0, 0, is_client=True),
    "browser": Spec("client", 0, 1e9, 1.0, 0, is_client=True),
    "mobile-app": Spec("client", 0, 1e9, 1.0, 0, is_client=True),
    "desktop-app": Spec("client", 0, 1e9, 1.0, 0, is_client=True),
    # networking
    "dns": Spec("networking", 15, 1_000_000, 0.99999, 30),
    "cdn": Spec("networking", 10, 300_000, 0.9999, 120),
    "load-balancer": Spec("networking", 2, 150_000, 0.9999, 60),
    "api-gateway": Spec("networking", 5, 70_000, 0.999, 90),
    "waf": Spec("networking", 3, 120_000, 0.9999, 70),
    "reverse-proxy": Spec("networking", 2, 130_000, 0.9995, 40),
    # compute
    "monolith": Spec("compute", 20, 8_000, 0.99, 200, is_consumer=True),
    "microservice": Spec("compute", 15, 12_000, 0.995, 120, is_consumer=True),
    "worker": Spec("compute", 50, 6_000, 0.99, 90, is_consumer=True),
    "cron-job": Spec("compute", 100, 200, 0.99, 20, is_consumer=True),
    "auth-service": Spec("compute", 12, 15_000, 0.999, 110, is_consumer=True),
    "notification-service": Spec("compute", 30, 9_000, 0.99, 80, is_consumer=True),
    # database
    "postgresql": Spec("database", 8, 15_000, 0.999, 250, is_persistence=True),
    "mysql": Spec("database", 8, 15_000, 0.999, 230, is_persistence=True),
    "mongodb": Spec("database", 7, 20_000, 0.999, 220, is_persistence=True),
    "cassandra": Spec("database", 10, 80_000, 0.9999, 400, is_persistence=True),
    "redis": Spec("database", 1, 150_000, 0.999, 150, is_persistence=True),
    "elasticsearch": Spec("database", 20, 18_000, 0.999, 350, is_persistence=True),
    # messaging
    "kafka": Spec("messaging", 5, 300_000, 0.9999, 300, is_queue=True),
    "rabbitmq": Spec("messaging", 6, 60_000, 0.999, 120, is_queue=True),
    "sqs": Spec("messaging", 10, 200_000, 0.9999, 80, is_queue=True),
    # storage
    "object-storage": Spec("storage", 30, 100_000, 0.99999, 100, is_persistence=True),
    "blob-storage": Spec("storage", 30, 100_000, 0.9999, 95, is_persistence=True),
    "data-lake": Spec("storage", 200, 10_000, 0.999, 300, is_persistence=True),
    # ai
    "llm": Spec("ai", 800, 400, 0.99, 1500, is_consumer=True),
    "embedding-service": Spec("ai", 120, 5_000, 0.99, 400, is_consumer=True),
    "vector-database": Spec("ai", 25, 12_000, 0.999, 300, is_persistence=True),
    "agent": Spec("ai", 1500, 200, 0.98, 800, is_consumer=True),
    "reranker": Spec("ai", 80, 6_000, 0.99, 250, is_consumer=True),
    # observability
    "prometheus": Spec("observability", 10, 30_000, 0.999, 80, is_persistence=True),
    "grafana": Spec("observability", 15, 4_000, 0.999, 50),
    "logging": Spec("observability", 20, 80_000, 0.999, 150, is_persistence=True),
    "tracing": Spec("observability", 15, 50_000, 0.999, 120, is_persistence=True),
}

VALID_TYPES = set(CATALOG.keys())


def get_spec(component_type: str) -> Spec | None:
    return CATALOG.get(component_type)
