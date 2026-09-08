import { effectiveTimeoutMs, type Deadline } from '@core/deadline';
import { type CircuitBreaker } from './circuit-breaker';
import {
  SYSTEM_RETRY_RUNTIME,
  withRetryAttempts,
  type RetryPolicy,
} from './retry';

export interface ResilienceAttempt {
  readonly attempt: number;
  readonly signal: AbortSignal;
}

export interface ResilienceExecutionOptions {
  readonly deadline: Deadline;
  readonly attemptTimeoutMs: number;
}

export interface ResiliencePipelineStart {
  circuitBreaker(breaker: CircuitBreaker): ResiliencePipelineAfterCircuit;
  retry(policy: RetryPolicy): ResiliencePipelineAfterRetry;
  timeout(options: ResilienceExecutionOptions): ResiliencePipelineComplete;
}

export interface ResiliencePipelineAfterCircuit {
  retry(policy: RetryPolicy): ResiliencePipelineAfterRetry;
  timeout(options: ResilienceExecutionOptions): ResiliencePipelineComplete;
  execute<T>(operation: (attempt: ResilienceAttempt) => Promise<T>): Promise<T>;
}

export interface ResiliencePipelineAfterRetry {
  timeout(options: ResilienceExecutionOptions): ResiliencePipelineComplete;
  execute<T>(operation: (attempt: ResilienceAttempt) => Promise<T>): Promise<T>;
}

export interface ResiliencePipelineComplete {
  execute<T>(operation: (attempt: ResilienceAttempt) => Promise<T>): Promise<T>;
}

interface ExecutionContext extends ResilienceExecutionOptions {
  readonly attempt: number;
  readonly circuitTrial: boolean;
  readonly signal?: AbortSignal;
}

type Operation<T> = (context: ExecutionContext) => Promise<T>;
type Policy = <T>(next: Operation<T>) => Operation<T>;

const UNBOUNDED_EXECUTION_OPTIONS: ResilienceExecutionOptions = {
  deadline: { deadlineAt: Number.POSITIVE_INFINITY },
  attemptTimeoutMs: Number.POSITIVE_INFINITY,
};

class Builder
  implements
    ResiliencePipelineStart,
    ResiliencePipelineAfterCircuit,
    ResiliencePipelineAfterRetry,
    ResiliencePipelineComplete
{
  private readonly policies: Policy[] = [];
  private executionOptions = UNBOUNDED_EXECUTION_OPTIONS;

  circuitBreaker(breaker: CircuitBreaker): ResiliencePipelineAfterCircuit {
    this.policies.push(
      (next) => (context) =>
        breaker.execute((circuitTrial) => next({ ...context, circuitTrial })),
    );
    return this;
  }

  retry(policy: RetryPolicy): ResiliencePipelineAfterRetry {
    this.policies.push(
      (next) => (context) =>
        withRetryAttempts(
          (attempt) => next({ ...context, attempt }),
          {
            deadline: context.deadline,
            policy: context.circuitTrial
              ? { ...policy, maxRetries: 0 }
              : policy,
          },
          SYSTEM_RETRY_RUNTIME,
        ),
    );
    return this;
  }

  timeout(options: ResilienceExecutionOptions): ResiliencePipelineComplete {
    this.executionOptions = options;
    this.policies.push(
      (next) => (context) =>
        next({
          ...context,
          signal: AbortSignal.timeout(
            effectiveTimeoutMs(context.deadline, context.attemptTimeoutMs),
          ),
        }),
    );
    return this;
  }

  execute<T>(
    operation: (attempt: ResilienceAttempt) => Promise<T>,
  ): Promise<T> {
    const terminal: Operation<T> = (context) => {
      return operation({
        attempt: context.attempt,
        signal: context.signal ?? new AbortController().signal,
      });
    };
    const composed = this.policies.reduceRight<Operation<T>>(
      (next, policy) => policy(next),
      terminal,
    );

    return composed({
      ...this.executionOptions,
      attempt: 0,
      circuitTrial: false,
    });
  }
}

export function resiliencePipeline(): ResiliencePipelineStart {
  return new Builder();
}
