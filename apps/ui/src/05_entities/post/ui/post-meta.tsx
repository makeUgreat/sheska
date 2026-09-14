import { MatchBadge } from './match-badge';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function Separator() {
  return <span className="h-1 w-1 rounded-full bg-outline-variant" />;
}

export function PostMeta({
  updatedAt,
  viewCount,
  similarity = null,
}: {
  updatedAt: string;
  viewCount: number;
  similarity?: number | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
      <span className="font-bold">{formatDate(updatedAt)}</span>
      <Separator />
      <span>{viewCount} views</span>
      {similarity !== null && (
        <>
          <Separator />
          <MatchBadge similarity={similarity} />
        </>
      )}
    </div>
  );
}
