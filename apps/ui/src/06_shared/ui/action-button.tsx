export const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';

const BASE = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-4 text-body-sm font-medium transition-colors disabled:cursor-not-allowed disabled:bg-plate-line disabled:text-text-muted ${FOCUS_RING}`;

export const ACTION_BUTTON = {
  accent: `${BASE} bg-accent-strong text-white hover:bg-accent-deep`,
  ink: `${BASE} bg-text-primary text-white hover:bg-surface-container-high`,
  outline: `${BASE} border border-outline-variant/25 bg-page-background text-text-primary hover:border-text-primary disabled:border-transparent`,
} as const;

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
    />
  );
}
