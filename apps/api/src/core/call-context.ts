import { computeDeadline, type Deadline } from './deadline';

export interface CallPolicy {
  readonly deadlineMs: number;
  readonly maxRetries: number;
}

export interface CallContext {
  readonly deadline: Deadline;
  readonly maxRetries: number;
}

export function callContext(policy: CallPolicy, now = Date.now()): CallContext {
  return {
    deadline: computeDeadline(policy.deadlineMs, now),
    maxRetries: policy.maxRetries,
  };
}
