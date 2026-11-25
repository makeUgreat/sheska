import { Inject, Injectable } from '@nestjs/common';
import { type CallContext } from '@core/call-context';
import { InputTooLargeError } from '@core/errors';
import { guardrails, LOGGER, type LoggerPort, type TextGenerationGuardrailsOutcome } from '@kernels/application';
import { type PostQuery, type TextGenerator } from '@contexts/library/application/ports';
import { PostSummary, type PostSummaryOutcome, type PostSummaryRepository, SourceFingerprint } from '@contexts/library/domain';
import { POST_QUERY, POST_SUMMARY_PROMPT, POST_SUMMARY_REPOSITORY, POST_SUMMARY_TEXT_GENERATOR } from '@contexts/library/library.di-tokens';
import {
  type PostSummaryDraft,
  MAX_SUMMARY_PERCENT,
  type PostSummaryPrompt,
  toPostSummaryRequest,
  toPostSummarySentences,
  toSentenceLimit,
} from './generate-post-summary.prompt';
import { HangulRatioGate } from './hangul-ratio.gate';
import { LengthRatioGate } from './length-ratio.gate';
import { NoMarkupGate } from './no-markup.gate';
import { toProseLength } from './prose-length';
import { SentenceCountGate } from './sentence-count.gate';

export interface GeneratePostSummaryCommand {
  readonly postId: string;
}

export interface GeneratePostSummaryResult {
  readonly outcome: PostSummaryOutcome['kind'] | 'skipped';
}

type PostSummaryFailure =
  | { readonly reason: 'input_too_large' }
  | { readonly reason: 'no_prose' }
  | { readonly reason: 'rejected'; readonly gate: string; readonly explanation: string };

@Injectable()
export class GeneratePostSummaryUseCase {
  constructor(
    @Inject(POST_QUERY)
    private readonly posts: PostQuery,
    @Inject(POST_SUMMARY_REPOSITORY)
    private readonly summaries: PostSummaryRepository,
    @Inject(POST_SUMMARY_TEXT_GENERATOR)
    private readonly generator: TextGenerator,
    @Inject(POST_SUMMARY_PROMPT)
    private readonly prompt: PostSummaryPrompt,
    @Inject(LOGGER)
    private readonly logger: LoggerPort,
  ) {}

  async execute(command: GeneratePostSummaryCommand, context: CallContext): Promise<GeneratePostSummaryResult> {
    const { postId } = command;

    const post = await this.posts.find({ id: postId });
    if (!post) return { outcome: 'skipped' };

    const fingerprint = SourceFingerprint.ofBody(post.body);
    const existing = await this.summaries.find({ postId });
    if (existing?.isCompletedFor(fingerprint)) return { outcome: 'skipped' };

    const summary = await this.summarize(postId, post.body, fingerprint, context);
    if (await this.hasBecomeOutdatedWhileGenerating(postId, fingerprint)) return { outcome: 'skipped' };

    await this.summaries.upsert(summary);

    return { outcome: summary.getProps().outcome.kind };
  }

  async handleFailure(command: GeneratePostSummaryCommand): Promise<void> {
    const { postId } = command;

    const post = await this.posts.find({ id: postId });
    if (!post) return;

    const fingerprint = SourceFingerprint.ofBody(post.body);
    const existing = await this.summaries.find({ postId });
    if (existing?.isCompletedFor(fingerprint)) return;

    await this.summaries.upsert(PostSummary.fail({ postId, fingerprint, finishedAt: new Date() }));
  }

  private async summarize(postId: string, body: string, fingerprint: SourceFingerprint, context: CallContext): Promise<PostSummary> {
    if (toProseLength(body) === 0) return this.fail(postId, fingerprint, { reason: 'no_prose' });

    const sentenceLimit = toSentenceLimit(body);

    let outcome: TextGenerationGuardrailsOutcome<PostSummaryDraft>;
    try {
      outcome = await guardrails<PostSummaryDraft>({ maxRegenerations: 2 })
        .check(new SentenceCountGate({ min: 1, max: sentenceLimit }), 'regenerate')
        .check(new NoMarkupGate(), 'regenerate')
        .check(new HangulRatioGate({ minPercent: 30 }), 'regenerate')
        .check(new LengthRatioGate({ maxPercent: MAX_SUMMARY_PERCENT }), 'regenerate')
        .execute(async (rejected) => {
          const result = await this.generator.generate(toPostSummaryRequest(body, this.prompt, sentenceLimit, rejected), context);

          return { ...result, body, sentences: toPostSummarySentences(result.text) };
        });
    } catch (error: unknown) {
      if (error instanceof InputTooLargeError) return this.fail(postId, fingerprint, { reason: 'input_too_large' });

      throw error;
    }

    if (outcome.kind === 'rejected') return this.fail(postId, fingerprint, { reason: 'rejected', ...outcome.failure });

    const { sentences, model } = outcome.output;
    return PostSummary.complete({ postId, fingerprint, sentences, model, finishedAt: new Date() });
  }

  private fail(postId: string, fingerprint: SourceFingerprint, failure: PostSummaryFailure): PostSummary {
    this.logger.warn('Post summary generation failed', { postId, ...failure });

    return PostSummary.fail({ postId, fingerprint, finishedAt: new Date() });
  }

  private async hasBecomeOutdatedWhileGenerating(postId: string, fingerprint: SourceFingerprint): Promise<boolean> {
    const latest = await this.posts.find({ id: postId });
    if (!latest) return true;

    return !SourceFingerprint.ofBody(latest.body).equals(fingerprint);
  }
}
