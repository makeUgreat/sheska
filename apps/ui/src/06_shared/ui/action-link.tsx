import { Link, type LinkProps } from 'react-router-dom';

export function ActionLink({
  children,
  className = '',
  hideArrow = false,
  ...props
}: LinkProps & { hideArrow?: boolean }) {
  return (
    <Link
      {...props}
      className={[
        'group/action inline-flex items-center gap-2 font-mono text-label-sm font-bold uppercase text-accent-strong',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span>{children}</span>
      {!hideArrow && (
        <span
          aria-hidden="true"
          className="transition-transform group-hover/action:translate-x-1"
        >
          -&gt;
        </span>
      )}
    </Link>
  );
}
