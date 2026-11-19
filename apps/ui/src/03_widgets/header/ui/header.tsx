import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLogOut, useViewer } from '@/entities/session';
import { PromptText, TrafficLights, type TerminalLaunchState } from '@/shared/ui';

const SECTIONS = [
  { href: '/posts', label: 'posts', ownerOnly: false },
  { href: '/sources', label: 'sources', ownerOnly: true },
] as const;

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low';

/** The prompt names the section you are in, not the document. */
function toCommand(pathname: string) {
  const [section] = pathname.split('/').filter(Boolean);
  return section ? `open ~/${section}` : 'cd ~';
}

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const viewer = useViewer();
  const logOut = useLogOut();
  const owner = viewer === 'owner';

  function handleYellowClick() {
    if (!owner) {
      navigate('/', { state: { run: 'su' } satisfies TerminalLaunchState });
      return;
    }
    logOut.mutate(undefined, {
      onSuccess: () => {
        if (isCurrent(pathname, '/sources')) navigate('/');
      },
    });
  }

  return (
    <header className="sticky top-0 z-50 bg-surface">
      <div className="h-11 border-b border-white/5 bg-surface-container-low/80 px-4">
        <div className="mx-auto flex h-full max-w-content items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="mr-2 hidden sm:flex">
              <TrafficLights yellowLabel={owner ? 'Log out' : 'Log in'} onYellowClick={handleYellowClick} />
            </span>
            <Link
              to="/"
              className={`font-sans text-body-lg font-semibold text-on-surface transition-colors hover:text-accent ${FOCUS_RING}`}
            >
              HASH
            </Link>
          </div>

          <nav aria-label="Sections" className="flex gap-3 font-mono text-label-sm sm:gap-6">
            {SECTIONS.filter(({ ownerOnly }) => owner || !ownerOnly).map(({ href, label }) => {
              const current = isCurrent(pathname, href);
              return (
                <Link
                  key={href}
                  to={href}
                  aria-current={current ? 'page' : undefined}
                  className={`transition-colors ${FOCUS_RING} ${current ? 'text-accent' : 'text-secondary hover:text-on-surface'}`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="h-10 px-4">
        <div className="mx-auto flex h-full max-w-content items-center font-mono text-code-snippet">
          <PromptText prompt={owner ? { identity: 'owner@hash', rest: ':~#' } : { identity: 'guest@hash', rest: ':~$' }} />
          <span className="ml-2 text-white">{toCommand(pathname)}</span>
          <span className="ml-1 h-4 w-2 animate-pulse bg-accent" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
