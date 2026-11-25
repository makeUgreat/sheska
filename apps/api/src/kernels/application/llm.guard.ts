import { type Gate, type GateFailure } from './gate';

export interface LlmGuardOptions {
  readonly maxRegenerations: number;
}

/**
 * - `regenerate`: 재생성 횟수가 남았으면 다시 생성함
 * - `reject`: 다시 생성하지 않고 거절함
 */
export type GateFailureAction = 'regenerate' | 'reject';

export interface LlmGuardRejection<TOutput> {
  readonly output: TOutput;
  readonly failure: GateFailure;
}

export interface LlmGuardAttempt<TOutput> {
  /** 0부터 셈 */
  readonly number: number;
  /** 앞선 시도의 출력과 실패 사유. 시간 순서 */
  readonly rejected: readonly LlmGuardRejection<TOutput>[];
}

export type LlmGuardOutcome<TOutput> =
  { readonly kind: 'passed'; readonly output: TOutput } | ({ readonly kind: 'rejected' } & LlmGuardRejection<TOutput>);

export interface LlmGuard<TOutput> {
  check(gate: Gate<TOutput>, onFail: GateFailureAction): LlmGuard<TOutput>;
  execute(operation: (attempt: LlmGuardAttempt<TOutput>) => Promise<TOutput>): Promise<LlmGuardOutcome<TOutput>>;
}

interface GateCheck<TOutput> {
  readonly gate: Gate<TOutput>;
  readonly onFail: GateFailureAction;
}

interface FailedCheck {
  readonly failure: GateFailure;
  readonly onFail: GateFailureAction;
}

class Guard<TOutput> implements LlmGuard<TOutput> {
  constructor(
    private readonly options: LlmGuardOptions,
    private readonly checks: readonly GateCheck<TOutput>[],
  ) {}

  check(gate: Gate<TOutput>, onFail: GateFailureAction): LlmGuard<TOutput> {
    return new Guard(this.options, [...this.checks, { gate, onFail }]);
  }

  async execute(operation: (attempt: LlmGuardAttempt<TOutput>) => Promise<TOutput>): Promise<LlmGuardOutcome<TOutput>> {
    let rejected: readonly LlmGuardRejection<TOutput>[] = [];

    for (let number = 0; ; number++) {
      const output = await operation({ number, rejected });
      const failed = this.findFailedCheck(output);

      if (failed && this.canRegenerate(failed, number)) {
        rejected = [...rejected, { output, failure: failed.failure }];
        continue;
      }
      if (failed) return { kind: 'rejected', output, failure: failed.failure };

      return { kind: 'passed', output };
    }
  }

  private findFailedCheck(output: TOutput): FailedCheck | undefined {
    for (const { gate, onFail } of this.checks) {
      const result = gate.judge(output);
      if (!result.passed) return { failure: { gate: gate.name, explanation: result.explanation }, onFail };
    }

    return undefined;
  }

  private canRegenerate(failed: FailedCheck, number: number): boolean {
    return failed.onFail === 'regenerate' && number < this.options.maxRegenerations;
  }
}

export function llmGuard<TOutput>(options: LlmGuardOptions): LlmGuard<TOutput> {
  return new Guard(options, []);
}
