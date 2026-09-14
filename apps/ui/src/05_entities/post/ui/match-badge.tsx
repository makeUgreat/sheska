import { Tag } from '@/shared/ui';

export function MatchBadge({ similarity }: { similarity: number }) {
  return <Tag tone="accent">{similarity}% match</Tag>;
}
