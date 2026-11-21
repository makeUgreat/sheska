import { formatWinterStatus } from '../../model/winter-status';

export function WinterStatusLine({ snowing }: { snowing: boolean }) {
  const today = new Date();

  return (
    <div
      aria-hidden="true"
      className="flex h-[26px] shrink-0 items-center gap-2.5 whitespace-nowrap border-t border-white/5 bg-surface-container-low/80 px-4 font-mono text-label-sm tracking-normal text-on-surface-muted"
    >
      <span className="hidden shrink-0 items-center gap-2.5 sm:flex">
        <span>
          <span className="text-terminal-output-error">*</span> winter
        </span>
        <span className="text-white/15">│</span>
      </span>
      <span className="shrink-0">
        snow <span className="text-white">{snowing ? 'on' : 'off'}</span>
      </span>
      <span className="ml-auto min-w-0 truncate">
        <span className="hidden sm:inline">{formatWinterStatus(today, 'christmas')}</span>
        <span className="sm:hidden">{formatWinterStatus(today, 'xmas')}</span>
      </span>
    </div>
  );
}
