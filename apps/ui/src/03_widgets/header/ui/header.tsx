import { Link, useLocation } from 'react-router-dom';

const SECTIONS = [
  { href: '/posts', label: 'posts' },
  { href: '/notes', label: 'notes' },
  { href: '/sources', label: 'sources' },
] as const;

const TRAFFIC_LIGHTS = [
  'bg-terminal-red',
  'bg-terminal-yellow',
  'bg-terminal-green',
] as const;

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low';

/** The prompt names the section you are in, not the document. */
function toCommand(pathname: string) {
  const [section] = pathname.split('/').filter(Boolean);
  return section ? `cd /${section}` : 'cd ~';
}

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-surface">
      <div className="h-11 border-b border-white/5 bg-surface-container-low/80 px-4">
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2" aria-hidden="true">
              {TRAFFIC_LIGHTS.map((light) => (
                <span key={light} className={`h-3 w-3 rounded-full ${light}`} />
              ))}
            </span>
            <Link
              to="/"
              className={`ml-2 font-sans text-body-lg font-semibold text-on-surface transition-colors hover:text-accent ${FOCUS_RING}`}
            >
              HASH
            </Link>
          </div>

          <nav
            aria-label="Sections"
            className="flex gap-6 font-mono text-label-sm"
          >
            {SECTIONS.map(({ href, label }) => {
              const current = isCurrent(pathname, href);
              return (
                <Link
                  key={href}
                  to={href}
                  aria-current={current ? 'page' : undefined}
                  className={`transition-colors ${FOCUS_RING} ${
                    current
                      ? 'text-accent'
                      : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="h-10 px-4">
        <div className="mx-auto flex h-full max-w-[1280px] items-center font-mono text-code-snippet">
          <span className="text-secondary">visitor@hash:~$</span>
          <span className="ml-2 text-white">{toCommand(pathname)}</span>
          <span
            className="ml-1 h-4 w-2 animate-pulse bg-accent"
            aria-hidden="true"
          />
        </div>
      </div>
    </header>
  );
}
