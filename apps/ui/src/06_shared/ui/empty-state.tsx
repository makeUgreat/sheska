export function EmptyState({
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
      <p className="text-body-md text-text-secondary">{label}</p>
    </div>
  );
}
