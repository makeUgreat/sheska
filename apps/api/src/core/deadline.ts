export interface Deadline {
  readonly deadlineAt: number;
}

export function computeDeadline(
  deadlineMs: number,
  now = Date.now(),
): Deadline {
  return { deadlineAt: now + deadlineMs };
}

export function remainingMs(deadline: Deadline, now = Date.now()): number {
  return deadline.deadlineAt - now;
}

export function effectiveTimeoutMs(
  deadline: Deadline,
  attemptTimeoutMs: number,
  now = Date.now(),
): number {
  return Math.max(0, Math.min(attemptTimeoutMs, remainingMs(deadline, now)));
}
