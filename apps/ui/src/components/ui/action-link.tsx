import { Link, type LinkProps } from 'react-router-dom';

export function ActionLink({ children, className = '', ...props }: LinkProps) {
  return (
    <Link
      {...props}
      className={[
        'group/action inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-accent',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className="transition-transform group-hover/action:translate-x-1"
      >
        -&gt;
      </span>
    </Link>
  );
}
