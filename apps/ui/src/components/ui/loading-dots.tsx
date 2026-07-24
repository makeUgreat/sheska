export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={['inline-flex gap-1.5', className].filter(Boolean).join(' ')}
    >
      <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
    </span>
  );
}
