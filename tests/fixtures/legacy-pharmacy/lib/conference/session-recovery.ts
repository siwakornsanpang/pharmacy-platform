interface SessionProblem {
  code?: unknown;
  meta?: { sessionCleared?: unknown } | null;
}

export function shouldReloadForStaleSession(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const problem = value as SessionProblem;
  return problem.code === "PHARMACY_SESSION_INVALID" && problem.meta?.sessionCleared === true;
}
