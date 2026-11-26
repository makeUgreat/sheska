import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/shared/ui';
import { SERVICES, type ServiceLink } from '../model/profile';

const ICON_PROPS = {
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  className: 'size-4 shrink-0 text-text-muted transition-colors duration-150 group-hover:text-inherit motion-reduce:transition-none',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const LINK_FACE: Record<ServiceLink['kind'], { label: string; icon: ReactNode }> = {
  site: {
    label: '사이트',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
      </svg>
    ),
  },
  npm: {
    label: 'npm',
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 17V8h8v9M12 11v6" />
      </svg>
    ),
  },
  github: {
    label: 'GitHub',
    icon: (
      <svg {...ICON_PROPS} viewBox="0 0 16 16" fill="currentColor" stroke="none">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
    ),
  },
};

const MUTED_LINK =
  'rounded-md text-body-sm font-medium transition-colors duration-150 hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none';

function ServiceLinks({ links }: { links: readonly ServiceLink[] }) {
  return (
    <ul className="mt-5.5 flex flex-wrap justify-center gap-x-4.5 gap-y-1.5">
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className={`group inline-flex items-center gap-1.5 text-text-secondary ${MUTED_LINK}`}
          >
            {LINK_FACE[link.kind].icon}
            {LINK_FACE[link.kind].label}
            <span className="sr-only">(새 탭에서 열림)</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17L17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ServicePage() {
  const { slug } = useParams<{ slug: string }>();
  const service = SERVICES.find((candidate) => candidate.slug === slug);

  if (!service) {
    return (
      <main className="mx-auto max-w-container-terminal px-gutter">
        <EmptyState variant="document" className="py-24" />
      </main>
    );
  }

  const hasLinks = service.links.length > 0;

  return (
    <main className="mx-auto flex max-w-container-terminal flex-col items-center px-gutter pb-24 pt-20 text-center lg:pt-28">
      <img src={service.logo.src} alt={service.logo.alt} className="size-16 rounded-[15px] shadow-[0_14px_30px_-16px_rgb(16_19_25/0.4)]" />
      <h1 className="mt-5.5 text-headline-md tracking-[-0.02em]">{service.name}</h1>
      <p className="mt-2.5 text-balance text-text-muted">
        소개글은 아직 준비 중이에요. 😅
        {hasLinks && (
          <>
            <br />
            서비스는 아래에서 체험해 볼 수 있어요.
          </>
        )}
      </p>
      {hasLinks && <ServiceLinks links={service.links} />}
      <Link to="/about" className={`mt-10 inline-flex items-center gap-2 text-text-muted ${MUTED_LINK}`}>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="M11 6l-6 6 6 6" />
        </svg>
        돌아가기
      </Link>
    </main>
  );
}
