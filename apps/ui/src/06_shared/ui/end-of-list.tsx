export function EndOfList({
  label,
  className = '',
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={['flex flex-col items-center gap-4', className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="font-mono text-label-sm uppercase text-text-muted">
        {label}
      </span>
    </div>
  );
}
