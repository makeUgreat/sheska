import { type ReactNode } from 'react';
import { TrafficLights } from '@/shared/ui';

export function TerminalWindow({
  yellowLabel,
  onYellowClick,
  footer,
  children,
}: {
  yellowLabel: string;
  onYellowClick: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-surface shadow-2xl">
      <div className="flex items-center gap-2 border-b border-white/5 bg-surface-container-low/80 px-4 py-3">
        <TrafficLights yellowLabel={yellowLabel} onYellowClick={onYellowClick} />
      </div>
      <div className="flex h-[clamp(400px,calc(100svh-11.5rem),620px)] flex-col">
        <div className="relative flex min-h-0 flex-1 flex-col font-mono text-display-terminal-mobile text-on-surface sm:text-display-terminal">
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}
