import { Link, type LinkProps } from 'react-router-dom';

const LABEL =
  'max-w-0 overflow-hidden whitespace-nowrap font-mono text-label-sm uppercase opacity-0 ' +
  'transition-[max-width,opacity] duration-300 ease-out ' +
  'group-hover/back:max-w-64 group-hover/back:opacity-100 ' +
  'group-focus-visible/back:max-w-64 group-focus-visible/back:opacity-100 ' +
  'motion-reduce:transition-none';

const SURFACE =
  'group/back -m-2.5 inline-flex items-center gap-2 rounded-md p-2.5 text-text-muted ' +
  'transition-colors hover:text-accent-strong focus:outline-none focus-visible:text-accent-strong ' +
  'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-page-background';

/** Drawn inline on the 24 box at stroke 2, like the landing hero's chevrons. */
function ArrowLeft() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6 shrink-0 transition-transform duration-300 ease-out group-hover/back:-translate-x-1 group-focus-visible/back:-translate-x-1 motion-reduce:transition-none"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </svg>
  );
}

/**
 * A chevron that names its destination on hover. The label stays in the
 * accessibility tree while it is collapsed, so it is the link's name.
 */
export function BackLink({ children, className = '', ...props }: LinkProps) {
  return (
    <Link {...props} className={[SURFACE, className].filter(Boolean).join(' ')}>
      <ArrowLeft />
      <span className={LABEL}>{children}</span>
    </Link>
  );
}
