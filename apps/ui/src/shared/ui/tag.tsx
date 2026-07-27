import { type ReactNode } from 'react';

type TagTone = 'accent' | 'muted';

const toneClass: Record<TagTone, string> = {
  accent: 'bg-accent text-white',
  muted:
    'border border-outline-variant/10 bg-surface-container-lowest text-text-secondary',
};

export function Tag({
  children,
  tone = 'accent',
  className = '',
}: {
  children: ReactNode;
  tone?: TagTone;
  className?: string;
}) {
  return (
    <span
      className={[
        'rounded px-2 py-0.5 font-mono text-[13px] font-medium uppercase leading-[18px]',
        toneClass[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
