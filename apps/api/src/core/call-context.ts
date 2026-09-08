import { computeDeadline, type Deadline } from './deadline';

export interface CallPolicy {
  readonly deadlineMs: number;
  readonly attemptTimeoutMs: number;
}

export interface CallContext {
  readonly deadline: Deadline;
  readonly attemptTimeoutMs: number;
}

export function createCallContext(
  policy: CallPolicy,
  now = Date.now(),
): CallContext {
  return {
    deadline: computeDeadline(policy.deadlineMs, now),
    attemptTimeoutMs: policy.attemptTimeoutMs,
  };
}
