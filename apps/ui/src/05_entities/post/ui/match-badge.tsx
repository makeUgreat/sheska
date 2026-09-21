export function MatchBadge({ similarity }: { similarity: number }) {
  return (
    <span className="ml-auto inline-block animate-[radar-ping_6s_ease-in-out_infinite] font-mono text-xs font-bold text-accent-strong">
      {similarity}%
    </span>
  );
}
