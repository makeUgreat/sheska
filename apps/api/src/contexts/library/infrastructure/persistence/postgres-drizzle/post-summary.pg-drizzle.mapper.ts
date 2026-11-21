import { InvariantViolationError } from '@core/errors';
import { PostSummary, type PostSummaryOutcome } from '@contexts/library/domain';
import { type PostSummaryInsert, type PostSummaryRow } from './schema';

export class PostSummaryPgDrizzleMapper {
  static toDomain(this: void, row: PostSummaryRow): PostSummary {
    return PostSummary.restore({
      postId: row.postId,
      fingerprint: row.fingerprint,
      outcome: PostSummaryPgDrizzleMapper.toOutcome(row),
      finishedAt: row.finishedAt,
    });
  }

  static toInsert(summary: PostSummary): PostSummaryInsert {
    const { fingerprint, outcome, finishedAt } = summary.getProps();

    return {
      postId: summary.id,
      fingerprint: fingerprint.unpack(),
      sentences: outcome.kind === 'completed' ? [...outcome.sentences] : null,
      model: outcome.kind === 'completed' ? outcome.model : null,
      finishedAt,
    };
  }

  static toOutcome(this: void, row: Pick<PostSummaryRow, 'sentences' | 'model'>): PostSummaryOutcome {
    if (row.sentences === null && row.model === null) {
      return { kind: 'failed' };
    }

    if (row.sentences !== null && row.model !== null) {
      return { kind: 'completed', sentences: row.sentences, model: row.model };
    }

    throw new InvariantViolationError({
      code: 'post_summary.partial_outcome',
      message: 'A stored post summary must have both sentences and model, or neither',
      details: { fields: ['sentences', 'model'] },
    });
  }
}
