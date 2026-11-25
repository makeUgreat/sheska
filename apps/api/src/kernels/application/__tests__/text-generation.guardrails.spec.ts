import { describe, expect, it, vi } from 'vitest';
import { type Gate } from '../gate';
import { guardrails, type TextGenerationFinishReason, type TextGenerationGuardrailsRejection } from '../text-generation.guardrails';

interface Output {
  readonly text: string;
  readonly finishReason: TextGenerationFinishReason;
}

const SHORT_GATE: Gate<Output> = {
  name: 'short',
  judge: ({ text }) => ({ passed: text.length <= 5, explanation: `${text.length}자` }),
};

const LOWERCASE_GATE: Gate<Output> = {
  name: 'lowercase',
  judge: ({ text }) => ({ passed: text === text.toLowerCase(), explanation: text }),
};

describe('guardrails', () => {
  it('모든 게이트를 통과하면 출력과 함께 accepted를 돌려준다', async () => {
    const outcome = await guardrails<Output>({ maxRegenerations: 1 })
      .check(SHORT_GATE, 'regenerate')
      .check(LOWERCASE_GATE, 'reject')
      .execute(() => Promise.resolve(completed('ok')));

    expect(outcome).toEqual({ kind: 'accepted', output: completed('ok') });
  });

  it.each(['truncated', 'refused'] as const)(
    '%s로 끝난 출력은 게이트를 판정하지 않고 다시 생성하지도 않고 거절한다',
    async (finishReason) => {
      const operation = vi.fn(() => Promise.resolve({ text: 'ok', finishReason }));
      const judge = vi.fn(() => ({ passed: true, explanation: '' }));

      const outcome = await guardrails<Output>({ maxRegenerations: 2 }).check({ name: 'any', judge }, 'regenerate').execute(operation);

      expect(outcome).toEqual({ kind: 'rejected', failure: { gate: 'completed', explanation: finishReason } });
      expect(judge).not.toHaveBeenCalled();
      expect(operation).toHaveBeenCalledOnce();
    },
  );

  it('등록한 순서대로 판정하고 처음 실패한 게이트 뒤는 판정하지 않는다', async () => {
    const laterJudge = vi.fn(() => ({ passed: true, explanation: '' }));
    const laterGate: Gate<Output> = { name: 'later', judge: laterJudge };

    const outcome = await guardrails<Output>({ maxRegenerations: 0 })
      .check(SHORT_GATE, 'reject')
      .check(laterGate, 'reject')
      .execute(() => Promise.resolve(completed('TOO LONG')));

    expect(outcome).toEqual({ kind: 'rejected', failure: { gate: 'short', explanation: '8자' } });
    expect(laterJudge).not.toHaveBeenCalled();
  });

  it('reject 게이트가 실패하면 재생성 횟수가 남아도 다시 생성하지 않는다', async () => {
    const operation = vi.fn(() => Promise.resolve(completed('LOUD')));

    const outcome = await guardrails<Output>({ maxRegenerations: 2 }).check(LOWERCASE_GATE, 'reject').execute(operation);

    expect(outcome).toMatchObject({ kind: 'rejected', failure: { gate: 'lowercase' } });
    expect(operation).toHaveBeenCalledOnce();
  });

  it('regenerate 게이트가 실패하면 앞선 출력과 실패 사유를 넘겨 다시 생성한다', async () => {
    const histories: (readonly TextGenerationGuardrailsRejection<Output>[])[] = [];

    const outcome = await guardrails<Output>({ maxRegenerations: 1 })
      .check(SHORT_GATE, 'regenerate')
      .execute((rejected) => {
        histories.push(rejected);
        return Promise.resolve(completed(rejected.length === 0 ? 'too long' : 'ok'));
      });

    expect(outcome).toEqual({ kind: 'accepted', output: completed('ok') });
    expect(histories).toEqual([[], [{ output: completed('too long'), failure: { gate: 'short', explanation: '8자' } }]]);
  });

  it('재생성 횟수를 다 쓰면 마지막 실패로 rejected를 돌려준다', async () => {
    const operation = vi.fn((rejected: readonly TextGenerationGuardrailsRejection<Output>[]) =>
      Promise.resolve(completed('x'.repeat(6 + rejected.length))),
    );

    const outcome = await guardrails<Output>({ maxRegenerations: 2 }).check(SHORT_GATE, 'regenerate').execute(operation);

    expect(outcome).toEqual({ kind: 'rejected', failure: { gate: 'short', explanation: '8자' } });
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('operation이 던진 예외는 잡지 않고 그대로 전파한다', async () => {
    const error = new Error('model unavailable');

    const outcome = guardrails<Output>({ maxRegenerations: 1 })
      .check(SHORT_GATE, 'regenerate')
      .execute(() => Promise.reject(error));

    await expect(outcome).rejects.toBe(error);
  });

  it('check는 원래 guardrails를 바꾸지 않는다', async () => {
    const base = guardrails<Output>({ maxRegenerations: 0 });
    base.check(SHORT_GATE, 'reject');

    const outcome = await base.execute(() => Promise.resolve(completed('TOO LONG')));

    expect(outcome).toEqual({ kind: 'accepted', output: completed('TOO LONG') });
  });
});

function completed(text: string): Output {
  return { text, finishReason: 'completed' };
}
