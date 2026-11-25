import { type Gate, type GateFailure } from './gate';

/**
 * - `regenerate`: 재생성 횟수가 남았으면 다시 생성함
 * - `reject`: 다시 생성하지 않고 거절함
 */
type GateFailureAction = 'regenerate' | 'reject';

/**
 * - `completed`: 모델이 응답을 스스로 끝냄
 * - `truncated`: 출력 토큰 상한에 닿아 응답이 잘림
 * - `refused`: 모델이 안전 정책으로 응답을 거부함
 */
export type TextGenerationFinishReason = 'completed' | 'truncated' | 'refused';

interface TextGenerationOutput {
  readonly finishReason: TextGenerationFinishReason;
}

export interface TextGenerationGuardrailsRejection<TOutput extends TextGenerationOutput> {
  readonly output: TOutput;
  readonly failure: GateFailure;
}

export type TextGenerationGuardrailsOutcome<TOutput extends TextGenerationOutput> =
  { readonly kind: 'accepted'; readonly output: TOutput } | { readonly kind: 'rejected'; readonly failure: GateFailure };

/**
 * Gate를 묶어 텍스트 생성 출력을 지키는 guardrail. Gate는 출력 하나를 판정하는 검사 하나이고,
 * guardrails는 Gate를 등록 순서대로 판정하며 실패하면 다시 생성하거나 거절함.
 * completed로 끝나지 않은 출력은 등록한 Gate보다 먼저, 다시 생성하지 않고 거절함
 */
export interface TextGenerationGuardrails<TOutput extends TextGenerationOutput> {
  check(gate: Gate<TOutput>, onFail: GateFailureAction): TextGenerationGuardrails<TOutput>;
  /** operation은 앞선 시도의 출력과 실패 사유를 시간 순서로 받음. 첫 시도에서는 빈 배열 */
  execute(
    operation: (rejected: readonly TextGenerationGuardrailsRejection<TOutput>[]) => Promise<TOutput>,
  ): Promise<TextGenerationGuardrailsOutcome<TOutput>>;
}

interface GateCheck<TOutput> {
  readonly gate: Gate<TOutput>;
  readonly onFail: GateFailureAction;
}

interface FailedCheck {
  readonly failure: GateFailure;
  readonly onFail: GateFailureAction;
}

class Guardrails<TOutput extends TextGenerationOutput> implements TextGenerationGuardrails<TOutput> {
  constructor(
    private readonly maxRegenerations: number,
    private readonly checks: readonly GateCheck<TOutput>[],
  ) {}

  check(gate: Gate<TOutput>, onFail: GateFailureAction): TextGenerationGuardrails<TOutput> {
    return new Guardrails(this.maxRegenerations, [...this.checks, { gate, onFail }]);
  }

  async execute(
    operation: (rejected: readonly TextGenerationGuardrailsRejection<TOutput>[]) => Promise<TOutput>,
  ): Promise<TextGenerationGuardrailsOutcome<TOutput>> {
    let rejected: readonly TextGenerationGuardrailsRejection<TOutput>[] = [];

    while (true) {
      const output = await operation(rejected);
      const failed = this.findFailedCheck(output);

      if (failed && this.canRegenerate(failed, rejected.length)) {
        rejected = [...rejected, { output, failure: failed.failure }];
        continue;
      }
      if (failed) return { kind: 'rejected', failure: failed.failure };

      return { kind: 'accepted', output };
    }
  }

  private findFailedCheck(output: TOutput): FailedCheck | undefined {
    const isCompleted = output.finishReason === 'completed';
    if (!isCompleted) return { failure: { gate: 'completed', explanation: output.finishReason }, onFail: 'reject' };

    for (const { gate, onFail } of this.checks) {
      const result = gate.judge(output);
      if (!result.passed) return { failure: { gate: gate.name, explanation: result.explanation }, onFail };
    }

    return undefined;
  }

  private canRegenerate(failed: FailedCheck, regenerations: number): boolean {
    return failed.onFail === 'regenerate' && regenerations < this.maxRegenerations;
  }
}

export function guardrails<TOutput extends TextGenerationOutput>(options: {
  readonly maxRegenerations: number;
}): TextGenerationGuardrails<TOutput> {
  return new Guardrails(options.maxRegenerations, []);
}
