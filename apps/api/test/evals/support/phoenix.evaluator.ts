import { asExperimentEvaluator } from '@arizeai/phoenix-client/experiments';
import { type Evaluator, type ExperimentEvaluationRun } from '@arizeai/phoenix-client/types/experiments';
import { type Gate, type GateResult } from './gate';

export interface GateSummary {
  readonly name: string;
  readonly failed: number;
  readonly total: number;
}

export interface ExperimentRunData {
  readonly input: unknown;
  readonly output: unknown;
}

export function toPhoenixEvaluator<TInput>(gate: Gate<TInput>, toGateInput: (run: ExperimentRunData) => TInput): Evaluator {
  return asExperimentEvaluator({
    name: gate.name,
    kind: 'CODE',
    evaluate: ({ input, output }) => toEvaluationResult(gate.judge(toGateInput({ input, output }))),
  });
}

function toEvaluationResult({ passed, explanation }: GateResult) {
  return { label: passed ? 'pass' : 'fail', score: passed ? 1 : 0, explanation };
}

export function toGateSummaries(evaluationRuns: readonly ExperimentEvaluationRun[]): GateSummary[] {
  const names = [...new Set(evaluationRuns.map((run) => run.name))];

  return names.map((name) => {
    const runs = evaluationRuns.filter((run) => run.name === name);
    const failed = runs.filter((run) => run.result?.label !== 'pass').length;

    return { name, failed, total: runs.length };
  });
}
