import { applyFullJitter } from './jitter';

export interface BackoffPolicy {
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

export function computeExponentialBackoffMs(
  attemptIndex: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  return Math.min(maxDelayMs, baseDelayMs * 2 ** attemptIndex);
}

export function computeRetryDelayMs(
  attemptIndex: number,
  policy: BackoffPolicy,
  random: () => number,
): number {
  return applyFullJitter(
    computeExponentialBackoffMs(
      attemptIndex,
      policy.baseDelayMs,
      policy.maxDelayMs,
    ),
    random,
  );
}
