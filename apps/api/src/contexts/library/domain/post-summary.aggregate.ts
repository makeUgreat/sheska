import { InvariantViolationError } from '@core/errors';
import { AggregateRoot } from '@kernels/domain';
import { SourceFingerprint } from './source-fingerprint.vo';

export type PostSummaryOutcome =
  { readonly kind: 'completed'; readonly sentences: readonly string[]; readonly model: string } | { readonly kind: 'failed' };

interface PostSummaryProps {
  fingerprint: SourceFingerprint;
  outcome: PostSummaryOutcome;
  finishedAt: Date;
}

export class PostSummary extends AggregateRoot<PostSummaryProps> {
  static complete(params: PostSummaryCompleteParams): PostSummary {
    return new PostSummary({
      id: params.postId,
      props: {
        fingerprint: params.fingerprint,
        outcome: { kind: 'completed', sentences: [...params.sentences], model: params.model },
        finishedAt: params.finishedAt,
      },
    });
  }

  static fail(params: PostSummaryFailParams): PostSummary {
    return new PostSummary({
      id: params.postId,
      props: {
        fingerprint: params.fingerprint,
        outcome: { kind: 'failed' },
        finishedAt: params.finishedAt,
      },
    });
  }

  static restore(params: PostSummaryRestoreParams): PostSummary {
    return new PostSummary({
      id: params.postId,
      props: {
        fingerprint: SourceFingerprint.of(params.fingerprint),
        outcome: params.outcome,
        finishedAt: params.finishedAt,
      },
    });
  }

  isCompletedFor(fingerprint: SourceFingerprint): boolean {
    return this.props.outcome.kind === 'completed' && this.props.fingerprint.equals(fingerprint);
  }

  public validate(): void {
    if (this.props.outcome.kind === 'completed' && this.props.outcome.sentences.length === 0) {
      throw new InvariantViolationError({
        code: 'post_summary.empty_sentences',
        message: 'A completed post summary must have at least one sentence',
        details: { fields: ['sentences'] },
      });
    }
  }
}

interface PostSummaryCompleteParams {
  postId: string;
  fingerprint: SourceFingerprint;
  sentences: readonly string[];
  model: string;
  finishedAt: Date;
}

interface PostSummaryFailParams {
  postId: string;
  fingerprint: SourceFingerprint;
  finishedAt: Date;
}

interface PostSummaryRestoreParams {
  postId: string;
  fingerprint: string;
  outcome: PostSummaryOutcome;
  finishedAt: Date;
}
