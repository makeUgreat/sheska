import { type ReactNode } from 'react';

type StatusMessageTone = 'loading' | 'empty' | 'error';

const toneClass: Record<StatusMessageTone, string> = {
  loading:
    'font-mono text-xs font-medium uppercase tracking-widest text-text-muted',
  empty: 'text-base leading-relaxed text-text-secondary',
  error:
    'rounded bg-error-container px-4 py-3 font-mono text-sm text-on-error-container',
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
