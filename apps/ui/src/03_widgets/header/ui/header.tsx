import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useViewer } from '@/entities/session';
import { prefersReducedMotion, PromptText, TrafficLights } from '@/shared/ui';
import { useAwaitedFetch } from '../model/use-awaited-fetch';
import { useRetypedCommand } from '../model/use-retyped-command';

const SECTIONS = [
  { href: '/posts', label: 'posts', ownerOnly: false },
  { href: '/about', label: 'about', ownerOnly: false },
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

/** 커서 블록(8×16px)과 같은 상자를 2열 4행 점자 칸으로 나눈다. viewBox 600×1200이 그 상자다. */
const SPINNER_PITCH = 300;
const SPINNER_RADIUS = 90;
const SPINNER_HEIGHT = 1200;
const SPINNER_ROW_GAP = (SPINNER_HEIGHT - SPINNER_RADIUS * 2) / 3;
/** 점자 칸의 테두리를 시계 방향으로 돈다. */
const SPINNER_PATH = [
  [0, 0],
  [1, 0],
  [1, 1],
  [1, 2],
  [1, 3],
  [0, 3],
  [0, 2],
  [0, 1],
] as const;
const SPINNER_LIT = 3;
const SPINNER_STEP_MS = 80;

/** 한 걸음마다 header 전체를 다시 그리지 않게 spinner만 따로 상태를 가진다. */
function PromptSpinner() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const timer = setInterval(() => setStep((current) => (current + 1) % SPINNER_PATH.length), SPINNER_STEP_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <svg aria-hidden="true" viewBox={`0 0 ${SPINNER_PITCH * 2} ${SPINNER_HEIGHT}`} className="ml-1 h-4 w-2">
      {SPINNER_PATH.map(([column, row], index) => (
        <circle
          key={index}
          cx={SPINNER_PITCH * column + SPINNER_PITCH / 2}
          cy={SPINNER_RADIUS + SPINNER_ROW_GAP * row}
          r={SPINNER_RADIUS}
          className={(index - step + SPINNER_PATH.length) % SPINNER_PATH.length < SPINNER_LIT ? 'fill-accent' : 'fill-on-surface-muted/50'}
        />
      ))}
    </svg>
  );
}

export function Header() {
  const { pathname } = useLocation();
  const owner = useViewer() === 'owner';
  const command = useRetypedCommand(toCommand(pathname));
  const { waiting, slowSeconds } = useAwaitedFetch();

  return (
    <header className="sticky top-0 z-50 bg-surface antialiased">
      <div className="h-11 border-b border-white/5 bg-surface-container-low/80 px-4">
        <div className="mx-auto flex h-full max-w-content items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="mr-2 hidden sm:flex">
              <TrafficLights />
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
          <span className="ml-2 text-white">{command}</span>
          {waiting ? <PromptSpinner /> : <span className="ml-1 h-4 w-2 animate-pulse bg-accent" aria-hidden="true" />}
          {slowSeconds !== null && (
            <span aria-hidden="true" className="ml-2 text-on-surface-muted tabular-nums">
              {slowSeconds}s
            </span>
          )}
        </div>
      </div>

      {waiting && (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden motion-reduce:hidden">
          <span className="block h-full w-1/3 animate-header-edge bg-linear-to-r from-transparent to-accent" />
        </span>
      )}
      <span role="status" className="sr-only">
        {waiting ? 'Loading' : ''}
      </span>
    </header>
  );
}
