export function ErrorState({
  error,
  className = '',
}: {
  error: Error;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={[
        'rounded bg-error-container px-4 py-3 font-mono text-code-snippet text-on-error-container',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      Error: {error.message}
    </p>
  );
}
