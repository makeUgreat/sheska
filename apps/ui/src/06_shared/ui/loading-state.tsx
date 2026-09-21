import { LoadingDots } from './loading-dots';

export function LoadingState({ className = '' }: { className?: string }) {
  return (
    <div
      className={['flex flex-col items-center gap-4', className]
        .filter(Boolean)
        .join(' ')}
    >
      <LoadingDots />
      <span className="font-mono text-label-sm uppercase text-text-muted">
        Loading
      </span>
    </div>
  );
}
