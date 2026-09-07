import { effectiveTimeoutMs, type Deadline } from '@core/deadline';

export function effectiveAbortSignal(
  deadline: Deadline,
  attemptTimeoutMs: number,
  now = Date.now(),
): AbortSignal {
  return AbortSignal.timeout(
    effectiveTimeoutMs(deadline, attemptTimeoutMs, now),
  );
}
