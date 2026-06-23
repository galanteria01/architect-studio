export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationKind =
  | "db-exposed-to-client"
  | "circular-dependency"
  | "unreachable-node"
  | "single-point-of-failure"
  | "overloaded-component"
  | "missing-persistence"
  | "dead-queue"
  | "region-failure-risk"
  | "empty-canvas";

export interface ValidationIssue {
  id: string;
  kind: ValidationKind;
  severity: ValidationSeverity;
  title: string;
  message: string;
  nodeIds: string[];
  edgeIds: string[];
}
