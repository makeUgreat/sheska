import { Tag } from '@/shared/ui';
import { type PostMatchReason } from '../api/types';

const MATCH_REASON_LABEL: Record<PostMatchReason, string> = {
  keyword: 'Keyword match',
  semantic: 'Semantic match',
  both: 'Keyword + Semantic',
};

export function MatchBadge({
  matchReason,
  similarity,
}: {
  matchReason: PostMatchReason;
  similarity: number | null;
}) {
  return (
    <Tag tone={matchReason === 'keyword' ? 'muted' : 'accent'}>
      {MATCH_REASON_LABEL[matchReason]}
      {similarity !== null && ` · ${similarity}%`}
    </Tag>
  );
}
