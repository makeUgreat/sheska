import { parseArgs } from 'node:util';
import { asExperimentEvaluator, runExperiment } from '@arizeai/phoenix-client/experiments';
import { z } from 'zod';
import { callContext } from '@core/call-context';
import {
  toPostSummaryRequest,
  toPostSummarySentences,
} from '@contexts/library/application/use-cases/post-summary/generate-post-summary.prompt';
import { TextAnthropicGenerator } from '@contexts/library/infrastructure/text-generation/anthropic/text.anthropic.generator';
import { KOREAN_GATE } from '../../library/post-summary/korean.gate';
import { PLAIN_TEXT_GATE } from '../../library/post-summary/plain-text.gate';
import { MAX_SENTENCES, SENTENCE_COUNT_GATE } from '../../library/post-summary/sentence-count.gate';
import { toSentenceLimit } from '../../library/post-summary/sentence-limit';
import { SUMMARY_RATIO_GATE } from '../../library/post-summary/summary-ratio.gate';
import { createPhoenixClient, toExperimentMetadata } from '../../support/phoenix.connection';
import { type ExperimentRunData, toGateSummaries, toPhoenixEvaluator } from '../../support/phoenix.evaluator';
import { readAnthropicApiKey } from '../support/anthropic.connection';
import { readGeneratePostSummaryExperimentSettings } from '../support/generate-post-summary.prompt.settings';

const DATASET_NAME = 'post-summary-notes-v1';

const argsSchema = z.object({
  'dry-run': z.coerce.number().int().positive().optional(),
  repetitions: z.coerce.number().int().positive().default(1),
  split: z.string().min(1).optional(),
});

const exampleInputSchema = z.object({ body: z.string() });

const taskOutputSchema = z.object({ sentences: z.array(z.string()), attempts: z.number().int().positive() });

const toSentences = ({ output }: ExperimentRunData) => taskOutputSchema.parse(output).sentences;

const toSummaryRatioInput = (run: ExperimentRunData) => ({ body: exampleInputSchema.parse(run.input).body, sentences: toSentences(run) });

const GATES = [SENTENCE_COUNT_GATE, PLAIN_TEXT_GATE, KOREAN_GATE];

const GATE_NAMES = [...GATES, SUMMARY_RATIO_GATE].map((gate) => gate.name);

const MAX_ATTEMPTS = 2;

const passesGates = (body: string, sentences: readonly string[]) =>
  GATES.every((gate) => gate.judge(sentences).passed) && SUMMARY_RATIO_GATE.judge({ body, sentences }).passed;

const FIRST_ATTEMPT_EVALUATOR = asExperimentEvaluator({
  name: 'first-attempt',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const { attempts } = taskOutputSchema.parse(output);
    const passed = attempts === 1;

    return { label: passed ? 'pass' : 'fail', score: passed ? 1 : 0, explanation: `${attempts}번 생성` };
  },
});

void main();

async function main(): Promise<void> {
  const args = argsSchema.parse(
    parseArgs({ options: { 'dry-run': { type: 'string' }, repetitions: { type: 'string' }, split: { type: 'string' } } }).values,
  );
  const apiKey = readAnthropicApiKey();
  const settings = readGeneratePostSummaryExperimentSettings();

  const experiment = await runExperiment({
    client: createPhoenixClient(),
    dataset: { datasetName: DATASET_NAME, splits: args.split ? [args.split] : undefined },
    experimentName: args.split ? `${settings.name} [${args.split}]` : settings.name,
    experimentMetadata: {
      prompt: settings.prompt,
      generator: settings.generator,
      instructionsFile: settings.instructionsFile,
      ...toExperimentMetadata(),
    },
    concurrency: 4,
    dryRun: args['dry-run'] ?? false,
    repetitions: args.repetitions,
    evaluators: [
      ...GATES.map((gate) => toPhoenixEvaluator(gate, toSentences)),
      toPhoenixEvaluator(SUMMARY_RATIO_GATE, toSummaryRatioInput),
      FIRST_ATTEMPT_EVALUATOR,
    ],
    task: async (example) => {
      const { body } = exampleInputSchema.parse(example.input);
      // runExperiment replaces the global tracer provider, and the SDK keeps the tracer it saw when the client was made
      const generator = new TextAnthropicGenerator({ apiKey }, settings.generator);
      const sentenceLimit = toSentenceLimit(body);
      const request = toPostSummaryRequest(body, settings.prompt);
      const limitTag = sentenceLimit < MAX_SENTENCES ? `\n<sentence_limit>${sentenceLimit}</sentence_limit>` : '';
      const limitedRequest = {
        ...request,
        input: request.input.map((message) => ({ ...message, content: `${message.content}${limitTag}` })),
      };
      const rejected: string[][] = [];

      for (let attempts = 1; ; attempts++) {
        const result = await generator.generate(limitedRequest, callContext({ deadlineMs: 90_000, maxRetries: 0 }));
        const sentences = toPostSummarySentences(result.text);
        const isGateViolation = result.finishReason === 'completed' && sentences.length > 0 && !passesGates(body, sentences);

        if (isGateViolation && attempts < MAX_ATTEMPTS) {
          rejected.push(sentences);
          continue;
        }

        return { text: result.text, finishReason: result.finishReason, model: result.model, sentences, sentenceLimit, attempts, rejected };
      }
    },
  });

  const summaries = toGateSummaries(experiment.evaluationRuns ?? []).filter(({ name }) => GATE_NAMES.includes(name));
  for (const { name, failed, total } of summaries) console.log(`[gate] ${name}: fail ${failed}/${total}`);

  const outputs = Object.values(experiment.runs).map((run) => taskOutputSchema.safeParse(run.output));
  const retried = outputs.filter((output) => output.success && output.data.attempts > 1).length;
  console.log(`[guard] retried ${retried}/${outputs.length}`);

  if (summaries.some(({ failed }) => failed > 0)) process.exitCode = 1;
}
