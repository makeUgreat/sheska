export function MatchBadge({ similarity }: { similarity: number }) {
  return (
    <span className="ml-auto inline-block animate-[radar-ping_2.4s_ease-in-out_infinite] font-mono text-xs font-bold text-accent/80">
      {similarity}%
    </span>
  );
}
