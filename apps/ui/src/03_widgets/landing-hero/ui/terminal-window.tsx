import { type ReactNode } from 'react';
import { TrafficLights } from '@/shared/ui';

export function TerminalWindow({
  title,
  yellowLabel,
  onYellowClick,
  children,
}: {
  title: string;
  yellowLabel: string;
  onYellowClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-surface shadow-2xl">
      <div className="flex items-center gap-2 border-b border-white/5 bg-surface-container-low/80 px-4 py-3">
        <TrafficLights
          yellowLabel={yellowLabel}
          onYellowClick={onYellowClick}
        />
        <span className="ml-4 font-mono text-[13px] leading-[18px] text-white/40">
          {title}
        </span>
      </div>
      <div className="flex h-[450px] flex-col font-mono text-display-terminal-mobile text-on-surface sm:text-display-terminal">
        {children}
      </div>
    </div>
  );
}
