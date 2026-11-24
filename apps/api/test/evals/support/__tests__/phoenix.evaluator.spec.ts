import { type ExperimentEvaluationRun } from '@arizeai/phoenix-client/types/experiments';
import { describe, expect, it } from 'vitest';
import { type Gate } from '../gate';
import { toGateSummaries, toPhoenixEvaluator } from '../phoenix.evaluator';

const buildEvaluationRun = (name: string, result: ExperimentEvaluationRun['result']): ExperimentEvaluationRun => ({
  id: `${name}-run`,
  experimentRunId: 'experiment-run',
  startTime: new Date(0),
  endTime: new Date(0),
  name,
  annotatorKind: 'CODE',
  error: result ? null : 'evaluator failed',
  result,
  traceId: null,
});

describe('toPhoenixEvaluator', () => {
  const evenGate: Gate<number> = { name: 'even', judge: (value) => ({ passed: value % 2 === 0, explanation: `${value}` }) };
  const evaluator = toPhoenixEvaluator(evenGate, ({ output }) => Number(output));

  it('gate 이름을 evaluator 이름으로 쓴다', () => {
    expect(evaluator.name).toBe('even');
  });

  it('통과하면 pass와 점수 1을 돌려준다', async () => {
    expect(await evaluator.evaluate({ input: {}, output: 2 })).toEqual({ label: 'pass', score: 1, explanation: '2' });
  });

  it('실패하면 fail과 점수 0을 돌려준다', async () => {
    expect(await evaluator.evaluate({ input: {}, output: 3 })).toEqual({ label: 'fail', score: 0, explanation: '3' });
  });

  it('gate 입력을 만들 때 run의 input도 넘긴다', async () => {
    const sumGate: Gate<number> = { name: 'sum', judge: (value) => ({ passed: true, explanation: `${value}` }) };
    const sumEvaluator = toPhoenixEvaluator(sumGate, ({ input, output }) => Number((input as { base: number }).base) + Number(output));

    expect(await sumEvaluator.evaluate({ input: { base: 10 }, output: 2 })).toMatchObject({ explanation: '12' });
  });
});

describe('toGateSummaries', () => {
  it('gate마다 fail 건수와 전체 건수를 센다', () => {
    const runs = [
      buildEvaluationRun('sentence-count', { label: 'pass' }),
      buildEvaluationRun('sentence-count', { label: 'fail' }),
      buildEvaluationRun('plain-text', { label: 'pass' }),
    ];

    expect(toGateSummaries(runs)).toEqual([
      { name: 'sentence-count', failed: 1, total: 2 },
      { name: 'plain-text', failed: 0, total: 1 },
    ]);
  });

  it('evaluator가 결과 없이 끝나면 fail로 센다', () => {
    expect(toGateSummaries([buildEvaluationRun('sentence-count', null)])).toEqual([{ name: 'sentence-count', failed: 1, total: 1 }]);
  });
});
