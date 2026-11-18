import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Terminal,
  type TerminalHandle,
  type TerminalLaunchState,
} from '@/shared/ui';
import { useShellCommands } from '../model/use-shell-commands';
import { TerminalWindow } from './terminal-window';

export function LandingHero({ articlesHref }: { articlesHref: string }) {
  const terminal = useRef<TerminalHandle>(null);
  const { viewer, commands, prompt } = useShellCommands();
  const owner = viewer === 'owner';
  const location = useLocation();
  const navigate = useNavigate();
  const launch = (location.state as TerminalLaunchState | null)?.run;

  useEffect(() => {
    if (!launch) return;
    terminal.current?.run(launch);
    // 새로고침이나 뒤로 가기로 같은 명령이 다시 돌지 않게 state를 지운다.
    navigate(location.pathname, { replace: true, state: null });
  }, [launch, location.pathname, navigate]);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-4 pb-24 pt-12">
      <div className="mb-12">
        <h1 className="select-none bg-gradient-to-r from-[#374151] to-black bg-clip-text text-[88px] font-bold leading-none tracking-tighter text-transparent sm:text-[120px] md:text-[180px]">
          HASH
        </h1>
      </div>

      <div className="z-10 mx-auto w-full max-w-container-terminal px-0 sm:px-6">
        <TerminalWindow
          yellowLabel={owner ? 'Log out' : 'Log in'}
          onYellowClick={() => terminal.current?.run(owner ? 'exit' : 'su')}
        >
          <Terminal
            ref={terminal}
            commands={commands}
            prompt={prompt}
            className="h-full p-4 [scrollbar-color:rgb(255_255_255/0.2)_transparent] [scrollbar-width:thin] sm:p-6"
            banner={
              <p className="mb-4 text-on-surface-muted">
                HASH shell · type <span className="text-white">help</span> to
                see commands.
              </p>
            }
          />
        </TerminalWindow>
      </div>

      <Link
        to={articlesHref}
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-on-secondary/30 transition-colors duration-300 ease-out animate-bounce hover:text-accent-strong"
      >
        <span className="font-mono text-label-sm uppercase">
          Scroll For Articles
        </span>
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 7l7 9 7-9" />
        </svg>
      </Link>
    </section>
  );
}
