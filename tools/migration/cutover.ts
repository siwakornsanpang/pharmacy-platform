import type { ReconciliationReport } from "./types";

export type CutoverDecision =
  | "ready"
  | "blocked"
  | "keep-new-db-and-revert-app"
  | "requires-reconcile";

export function evaluateCutover(input: {
  reconciliation: ReconciliationReport;
  writersFrozen: boolean;
  newWrites: boolean;
  compatibleReleaseAvailable: boolean;
}): CutoverDecision {
  if (!input.reconciliation.passed || !input.writersFrozen) return "blocked";
  if (!input.newWrites) return "ready";
  if (input.compatibleReleaseAvailable) return "keep-new-db-and-revert-app";
  return "requires-reconcile";
}
