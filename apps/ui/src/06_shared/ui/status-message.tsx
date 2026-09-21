import { type ReactNode } from 'react';

type StatusMessageTone = 'empty' | 'error';

const toneClass: Record<StatusMessageTone, string> = {
  empty: 'text-body-md text-text-secondary',
  error:
    'rounded bg-error-container px-4 py-3 font-mono text-code-snippet text-on-error-container',
};

export function StatusMessage({
  tone,
  children,
  className = '',
}: {
  tone: StatusMessageTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : undefined}
      className={[toneClass[tone], className].filter(Boolean).join(' ')}
    >
      {children}
    </p>
  );
}
