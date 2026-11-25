import { describe, expect, it, vi } from 'vitest';
import { type Gate } from '../gate';
import { llmGuard, type LlmGuardAttempt } from '../llm.guard';

const SHORT_GATE: Gate<string> = {
  name: 'short',
  judge: (output) => ({ passed: output.length <= 5, explanation: `${output.length}자` }),
};

const LOWERCASE_GATE: Gate<string> = {
  name: 'lowercase',
  judge: (output) => ({ passed: output === output.toLowerCase(), explanation: output }),
};

describe('llmGuard', () => {
  it('모든 게이트를 통과하면 출력과 함께 passed를 돌려준다', async () => {
    const outcome = await llmGuard<string>({ maxRegenerations: 1 })
      .check(SHORT_GATE, 'regenerate')
      .check(LOWERCASE_GATE, 'reject')
      .execute(() => Promise.resolve('ok'));

    expect(outcome).toEqual({ kind: 'passed', output: 'ok' });
  });

  it('등록한 순서대로 판정하고 처음 실패한 게이트 뒤는 판정하지 않는다', async () => {
    const laterJudge = vi.fn(() => ({ passed: true, explanation: '' }));
    const laterGate: Gate<string> = { name: 'later', judge: laterJudge };

    const outcome = await llmGuard<string>({ maxRegenerations: 0 })
      .check(SHORT_GATE, 'reject')
      .check(laterGate, 'reject')
      .execute(() => Promise.resolve('TOO LONG'));

    expect(outcome).toEqual({ kind: 'rejected', output: 'TOO LONG', failure: { gate: 'short', explanation: '8자' } });
    expect(laterJudge).not.toHaveBeenCalled();
  });

  it('reject 게이트가 실패하면 재생성 횟수가 남아도 다시 생성하지 않는다', async () => {
    const operation = vi.fn(() => Promise.resolve('LOUD'));

    const outcome = await llmGuard<string>({ maxRegenerations: 2 }).check(LOWERCASE_GATE, 'reject').execute(operation);

    expect(outcome).toMatchObject({ kind: 'rejected', failure: { gate: 'lowercase' } });
    expect(operation).toHaveBeenCalledOnce();
  });

  it('regenerate 게이트가 실패하면 앞선 출력과 실패 사유를 넘겨 다시 생성한다', async () => {
    const attempts: LlmGuardAttempt<string>[] = [];

    const outcome = await llmGuard<string>({ maxRegenerations: 1 })
      .check(SHORT_GATE, 'regenerate')
      .execute((attempt) => {
        attempts.push(attempt);
        return Promise.resolve(attempt.number === 0 ? 'too long' : 'ok');
      });

    expect(outcome).toEqual({ kind: 'passed', output: 'ok' });
    expect(attempts).toEqual([
      { number: 0, rejected: [] },
      { number: 1, rejected: [{ output: 'too long', failure: { gate: 'short', explanation: '8자' } }] },
    ]);
  });

  it('재생성 횟수를 다 쓰면 마지막 실패로 rejected를 돌려준다', async () => {
    const operation = vi.fn((attempt: LlmGuardAttempt<string>) => Promise.resolve(`attempt ${attempt.number}`));

    const outcome = await llmGuard<string>({ maxRegenerations: 2 }).check(SHORT_GATE, 'regenerate').execute(operation);

    expect(outcome).toEqual({ kind: 'rejected', output: 'attempt 2', failure: { gate: 'short', explanation: '9자' } });
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('operation이 던진 예외는 잡지 않고 그대로 전파한다', async () => {
    const error = new Error('model unavailable');

    const outcome = llmGuard<string>({ maxRegenerations: 1 })
      .check(SHORT_GATE, 'regenerate')
      .execute(() => Promise.reject(error));

    await expect(outcome).rejects.toBe(error);
  });

  it('check는 원래 guard를 바꾸지 않는다', async () => {
    const base = llmGuard<string>({ maxRegenerations: 0 });
    base.check(SHORT_GATE, 'reject');

    const outcome = await base.execute(() => Promise.resolve('TOO LONG'));

    expect(outcome).toEqual({ kind: 'passed', output: 'TOO LONG' });
  });
});
