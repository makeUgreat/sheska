import {
  circuitBreaker as createCockatielCircuitBreaker,
  handleWhen,
  isBrokenCircuitError,
  SamplingBreaker,
  CircuitState as CockatielCircuitState,
  type CircuitBreakerPolicy as CockatielCircuitBreakerPolicy,
  type FailureReason,
} from 'cockatiel';
import { type LoggerPort } from '@kernels/application';
import { classifyInfrastructureRetry } from './retry-error.classifier';

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerPolicy {
  readonly failureRateThreshold: number; // 0 < x <= 1
  readonly evaluationWindowMs: number;
  readonly minimumRequestCount: number;
  readonly openDurationMs: number;
}

export interface CircuitBreakerOptions {
  readonly name?: string;
  readonly policy: CircuitBreakerPolicy;
  readonly isFailure?: (error: unknown) => boolean;
  readonly logger?: LoggerPort;
}

function describeBreakReason(
  reason: FailureReason<unknown> | { isolated: true },
): unknown {
  if ('isolated' in reason) return 'isolated';
  return 'error' in reason ? reason.error : reason.value;
}

export class CircuitBreakerOpenError extends Error {
  constructor(message = 'circuit breaker is open') {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

const COCKATIEL_STATE_TO_OURS: Record<
  CockatielCircuitState,
  CircuitBreakerState
> = {
  [CockatielCircuitState.Closed]: 'closed',
  [CockatielCircuitState.Open]: 'open',
  [CockatielCircuitState.HalfOpen]: 'half-open',
  // We never call isolate(), so this is unreachable in practice; treat as
  // open defensively (fail fast, never treat an isolated breaker as a trial).
  [CockatielCircuitState.Isolated]: 'open',
};

export class CircuitBreaker {
  private readonly breaker: CockatielCircuitBreakerPolicy;

  constructor(options: CircuitBreakerOptions) {
    const isFailure =
      options.isFailure ??
      ((error: unknown) => classifyInfrastructureRetry(error).retryable);
    const {
      failureRateThreshold,
      evaluationWindowMs,
      minimumRequestCount,
      openDurationMs,
    } = options.policy;

    this.breaker = createCockatielCircuitBreaker(handleWhen(isFailure), {
      halfOpenAfter: openDurationMs,
      breaker: new SamplingBreaker({
        threshold: failureRateThreshold,
        duration: evaluationWindowMs,
        minimumRps: minimumRequestCount / (evaluationWindowMs / 1000),
      }),
    });

    const name = options.name ?? 'circuit-breaker';
    const logger = options.logger;
    if (logger) {
      this.breaker.onBreak((reason) => {
        logger.warn('Circuit breaker opened', {
          name,
          event: 'circuit_breaker.opened',
          reason: describeBreakReason(reason),
        });
      });
      this.breaker.onHalfOpen(() => {
        logger.log('Circuit breaker half-open, trialing next request', {
          name,
          event: 'circuit_breaker.half_open',
        });
      });
      this.breaker.onReset(() => {
        logger.log('Circuit breaker closed', {
          name,
          event: 'circuit_breaker.closed',
        });
      });
    }
  }

  get state(): CircuitBreakerState {
    return COCKATIEL_STATE_TO_OURS[this.breaker.state];
  }

  async execute<T>(operation: (isTrial: boolean) => Promise<T>): Promise<T> {
    try {
      return await this.breaker.execute(() =>
        operation(this.state === 'half-open'),
      );
    } catch (error) {
      if (isBrokenCircuitError(error)) {
        throw new CircuitBreakerOpenError();
      }
      throw error;
    }
  }
}
