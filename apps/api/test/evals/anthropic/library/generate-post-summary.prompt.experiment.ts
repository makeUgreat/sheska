import { parseArgs } from 'node:util';
import { runExperiment } from '@arizeai/phoenix-client/experiments';
import { z } from 'zod';
import { callContext } from '@core/call-context';
import { toPostSummaryRequest, toPostSummarySentences } from '@contexts/library/application/use-cases/generate-post-summary.prompt';
import { TextAnthropicGenerator } from '@contexts/library/infrastructure/text-generation/anthropic/text.anthropic.generator';
import { createPhoenixClient, toExperimentMetadata } from '../../support/phoenix.connection';
import { readAnthropicApiKey } from '../support/anthropic.connection';
import { readGeneratePostSummaryExperimentSettings } from '../support/generate-post-summary.prompt.settings';

const DATASET_NAME = 'post-summary-notes-v1';

const argsSchema = z.object({
  'dry-run': z.coerce.number().int().positive().optional(),
});

const exampleInputSchema = z.object({ body: z.string() });

void main();

async function main(): Promise<void> {
  const args = argsSchema.parse(parseArgs({ options: { 'dry-run': { type: 'string' } } }).values);
  const apiKey = readAnthropicApiKey();
  const settings = readGeneratePostSummaryExperimentSettings();

  await runExperiment({
    client: createPhoenixClient(),
    dataset: { datasetName: DATASET_NAME },
    experimentName: settings.name,
    experimentMetadata: {
      prompt: settings.prompt,
      generator: settings.generator,
      instructionsFile: settings.instructionsFile,
      ...toExperimentMetadata(),
    },
    concurrency: 4,
    dryRun: args['dry-run'] ?? false,
    task: async (example) => {
      const { body } = exampleInputSchema.parse(example.input);
      // runExperiment replaces the global tracer provider, and the SDK keeps the tracer it saw when the client was made
      const generator = new TextAnthropicGenerator({ apiKey }, settings.generator);
      const result = await generator.generate(
        toPostSummaryRequest(body, settings.prompt),
        callContext({ deadlineMs: 90_000, maxRetries: 0 }),
      );

      return {
        text: result.text,
        finishReason: result.finishReason,
        model: result.model,
        sentences: toPostSummarySentences(result.text),
      };
    },
  });
}
