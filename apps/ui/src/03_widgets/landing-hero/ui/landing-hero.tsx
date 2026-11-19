import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Terminal, type TerminalHandle, type TerminalLaunchState } from '@/shared/ui';
import { useShellCommands } from '../model/use-shell-commands';
import { TerminalWindow } from './terminal-window';

/** figlet small 글꼴. 웹 글꼴에 없는 블록 문자 대신 ASCII만 써서 폭이 어긋나지 않는다. */
const LOGO = [' _  _   _   ___ _  _ ', '| || | /_\\ / __| || |', '| __ |/ _ \\\\__ \\ __ |', '|_||_/_/ \\_\\___/_||_|'].join('\n');

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
      {/* 보이는 제목은 터미널 안의 아스키 로고다. 화면 낭독기에는 이 제목을 읽힌다. */}
      <h1 className="sr-only">HASH</h1>

      <div className="z-10 mx-auto w-full max-w-container-terminal px-0 sm:px-6">
        <TerminalWindow yellowLabel={owner ? 'Log out' : 'Log in'} onYellowClick={() => terminal.current?.run(owner ? 'exit' : 'su')}>
          <Terminal
            ref={terminal}
            commands={commands}
            prompt={prompt}
            className="h-full p-4 [scrollbar-color:rgb(255_255_255/0.2)_transparent] [scrollbar-width:thin] sm:p-6"
            banner={
              <div className="mb-4">
                <pre aria-hidden="true" className="mb-3 font-[inherit] leading-[1.15] text-accent">
                  {LOGO}
                </pre>
                <p className="text-on-surface-muted">
                  Hi, I&apos;m <span className="text-accent">Hash</span>. Here is how I think, what I&apos;ve learned, and who I am.
                </p>
                <p className="text-on-surface-muted">
                  Browse with <span className="text-white">ls</span>, search with{' '}
                  <span className="whitespace-nowrap text-white">grep &lt;word&gt;</span>, or ask an AI with{' '}
                  <span className="whitespace-nowrap text-white">ai &lt;question&gt;</span>.
                </p>
                <p className="text-on-surface-muted">
                  Type <span className="text-white">help</span> for more.
                </p>
              </div>
            }
          />
        </TerminalWindow>
      </div>

      <Link
        to={articlesHref}
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-on-secondary/30 transition-colors duration-300 ease-out animate-bounce hover:text-accent-strong"
      >
        <span className="font-mono text-label-sm uppercase">Scroll For Articles</span>
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
