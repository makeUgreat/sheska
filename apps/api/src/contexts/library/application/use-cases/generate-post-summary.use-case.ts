import { Inject, Injectable } from '@nestjs/common';
import { type CallContext } from '@core/call-context';
import { InputTooLargeError } from '@core/errors';
import { LOGGER, type LoggerPort } from '@kernels/application';
import { type PostQuery, type TextGenerationResult, type TextGenerator } from '@contexts/library/application/ports';
import { PostSummary, type PostSummaryOutcome, type PostSummaryRepository, SourceFingerprint } from '@contexts/library/domain';
import { POST_QUERY, POST_SUMMARY_REPOSITORY, POST_SUMMARY_TEXT_GENERATOR } from '@contexts/library/library.di-tokens';
import { toPostSummaryRequest, toPostSummarySentences } from './generate-post-summary.prompt';

export interface GeneratePostSummaryCommand {
  readonly postId: string;
}

export interface GeneratePostSummaryResult {
  readonly outcome: PostSummaryOutcome['kind'] | 'skipped';
}

type PostSummaryFailureReason = 'truncated' | 'refused' | 'no_sentences' | 'input_too_large';

@Injectable()
export class GeneratePostSummaryUseCase {
  constructor(
    @Inject(POST_QUERY)
    private readonly posts: PostQuery,
    @Inject(POST_SUMMARY_REPOSITORY)
    private readonly summaries: PostSummaryRepository,
    @Inject(POST_SUMMARY_TEXT_GENERATOR)
    private readonly generator: TextGenerator,
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
    try {
      const result = await this.generator.generate(toPostSummaryRequest(body), context);
      return this.toSummary(postId, fingerprint, result);
    } catch (error: unknown) {
      if (error instanceof InputTooLargeError) return this.fail(postId, fingerprint, 'input_too_large');

      throw error;
    }
  }

  private toSummary(postId: string, fingerprint: SourceFingerprint, result: TextGenerationResult): PostSummary {
    switch (result.finishReason) {
      case 'truncated':
      case 'refused':
        return this.fail(postId, fingerprint, result.finishReason);
      case 'completed': {
        const sentences = toPostSummarySentences(result.text);
        if (sentences.length === 0) return this.fail(postId, fingerprint, 'no_sentences');

        return PostSummary.complete({ postId, fingerprint, sentences, model: result.model, finishedAt: new Date() });
      }
    }
  }

  private fail(postId: string, fingerprint: SourceFingerprint, reason: PostSummaryFailureReason): PostSummary {
    this.logger.warn('Post summary generation failed', { postId, reason });

    return PostSummary.fail({ postId, fingerprint, finishedAt: new Date() });
  }

  private async hasBecomeOutdatedWhileGenerating(postId: string, fingerprint: SourceFingerprint): Promise<boolean> {
    const latest = await this.posts.find({ id: postId });
    if (!latest) return true;

    return !SourceFingerprint.ofBody(latest.body).equals(fingerprint);
  }
}
