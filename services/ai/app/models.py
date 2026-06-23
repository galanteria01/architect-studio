"""Pydantic schemas mirrored with the TypeScript `services/ai/types.ts`."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class AIGraphNode(BaseModel):
    id: str
    type: str
    label: Optional[str] = None
    region: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None


class AIGraphEdge(BaseModel):
    source: str
    target: str
    protocol: Optional[str] = "HTTP"


class AIGraphSpec(BaseModel):
    nodes: list[AIGraphNode] = Field(default_factory=list)
    edges: list[AIGraphEdge] = Field(default_factory=list)


class GenerateRequest(BaseModel):
    prompt: str


class GenerateResponse(BaseModel):
    requirements: list[str]
    architecture: AIGraphSpec
    costEstimate: float
    notes: str
    fallback: bool = False


class GraphRequest(BaseModel):
    graph: AIGraphSpec


class ReviewScores(BaseModel):
    scalability: float
    reliability: float
    performance: float
    cost: float
    maintainability: float


class ReviewResponse(BaseModel):
    scores: ReviewScores
    overall: float
    summary: str
    strengths: list[str]
    weaknesses: list[str]
    suggestions: list[str]
    fallback: bool = False


class OptimizationAction(BaseModel):
    kind: str
    target: Optional[str] = None


class OptimizationSuggestion(BaseModel):
    id: str
    title: str
    description: str
    action: OptimizationAction


class OptimizeResponse(BaseModel):
    suggestions: list[OptimizationSuggestion]
    fallback: bool = False


class InterviewQuestionRequest(BaseModel):
    topic: Optional[str] = None


class InterviewQuestion(BaseModel):
    question: str
    topic: str
    rubric: list[str]


class InterviewEvaluateRequest(BaseModel):
    question: str
    graph: AIGraphSpec


class InterviewEvaluation(BaseModel):
    score: float
    feedback: str
    missing: list[str]
    good: list[str]
    fallback: bool = False


class HealthResponse(BaseModel):
    status: str
    providers: dict[str, bool]
    model: Optional[str] = None
