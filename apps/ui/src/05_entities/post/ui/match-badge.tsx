export function MatchBadge({ similarity }: { similarity: number }) {
  return (
    <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-xs font-bold text-accent/80">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
      <span className="inline-block animate-[heartbeat_1.4s_ease-in-out_infinite]">
        {similarity}%
      </span>
    </span>
  );
}
