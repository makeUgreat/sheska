import { LoadingDots } from '@/shared/ui';

export function NotesLoading({
  label = 'Loading more notes...',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={['mt-16 flex flex-col items-center gap-4 pt-12', className]
        .filter(Boolean)
        .join(' ')}
    >
      <LoadingDots />
      <span className="font-mono text-xs font-medium uppercase tracking-widest text-text-muted">
        {label}
      </span>
    </div>
  );
}

export function EndOfNotes() {
  return (
    <div className="mt-16 flex flex-col items-center gap-4 pt-12">
      <span className="font-mono text-xs font-medium uppercase tracking-widest text-text-muted">
        End of notes
      </span>
    </div>
  );
}
