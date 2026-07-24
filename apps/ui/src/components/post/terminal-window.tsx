import { type ReactNode } from 'react';

export function TerminalWindow({
  prompt,
  children,
  cursor,
  title = 'zsh - 80x24',
}: {
  prompt?: ReactNode;
  children: ReactNode;
  cursor?: ReactNode;
  title?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-surface shadow-2xl">
      <div className="flex items-center gap-2 border-b border-white/5 bg-surface-container-low/80 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-terminal-red" />
        <span className="h-3 w-3 rounded-full bg-terminal-yellow" />
        <span className="h-3 w-3 rounded-full bg-terminal-green" />
        <span className="ml-4 font-mono text-[13px] leading-[18px] text-white/40">
          {title}
        </span>
      </div>
      <div className="min-h-[450px] p-6 font-mono text-display-terminal-mobile text-accent sm:text-display-terminal">
        {prompt}
        {children}
        {cursor}
      </div>
    </div>
  );
}
