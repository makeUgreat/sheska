import { Link, type LinkProps } from 'react-router-dom';

const CARD_LINK_SURFACE =
  'group/card block rounded-lg transition duration-200 ease-out hover:-translate-y-px hover:bg-accent/5 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page-background motion-reduce:transition-none motion-reduce:hover:translate-y-0';

export const CARD_LINK_TITLE =
  'transition-colors group-hover/card:text-accent-strong';

export function CardLink({ children, className = '', ...props }: LinkProps) {
  return (
    <Link
      {...props}
      className={[CARD_LINK_SURFACE, className].filter(Boolean).join(' ')}
    >
      {children}
    </Link>
  );
}
