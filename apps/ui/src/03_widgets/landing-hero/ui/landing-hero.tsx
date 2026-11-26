import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSeason } from '@/shared/lib';
import { Terminal, type TerminalHandle, type TerminalLaunchState } from '@/shared/ui';
import { useShellCommands } from '../model/use-shell-commands';
import { useSnowCommand } from '../model/use-snow-command';
import { formatWinterGreeting } from '../model/winter-status';
import { HeroLinks } from './hero-links';
import { TerminalWindow } from './terminal-window';
import { Snowfall } from './winter/snowfall';
import { WinterStatusLine } from './winter/status-line';
import { WinterLogo } from './winter/winter-logo';

/** figlet small 글꼴. 웹 글꼴에 없는 블록 문자 대신 ASCII만 써서 폭이 어긋나지 않는다. */
const LOGO = [' _  _   _   ___ _  _ ', '| || | /_\\ / __| || |', '| __ |/ _ \\\\__ \\ __ |', '|_||_/_/ \\_\\___/_||_|'].join('\n');

export function LandingHero({ articlesHref, aboutHref, githubHref }: { articlesHref: string; aboutHref: string; githubHref: string }) {
  const terminal = useRef<TerminalHandle>(null);
  const { viewer, commands: shellCommands, prompt } = useShellCommands();
  const owner = viewer === 'owner';
  const location = useLocation();
  const navigate = useNavigate();
  const launch = (location.state as TerminalLaunchState | null)?.run;
  const winter = useSeason() === 'winter';
  const snow = useSnowCommand();
  const commands = winter ? [...shellCommands, snow.command] : shellCommands;

  useEffect(() => {
    if (!launch) return;

    terminal.current?.run(launch);
    // 새로고침이나 뒤로 가기로 같은 명령이 다시 돌지 않게 state를 지운다.
    void navigate(location.pathname, { replace: true, state: null });
  }, [launch, location.pathname, navigate]);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-4 pb-24 pt-12">
      {/* 보이는 제목은 터미널 안의 아스키 로고다. 화면 낭독기에는 이 제목을 읽힌다. */}
      <h1 className="sr-only">HASH</h1>

      <div className="z-10 mx-auto w-full max-w-container-terminal px-0 sm:px-6">
        <div className="relative">
          <HeroLinks articlesHref={articlesHref} aboutHref={aboutHref} githubHref={githubHref} />
          <TerminalWindow
            yellowLabel={owner ? 'Log out' : 'Log in'}
            onYellowClick={() => terminal.current?.run(owner ? 'exit' : 'su')}
            footer={winter && <WinterStatusLine snowing={snow.snowing} />}
          >
            {winter && snow.snowing && <Snowfall />}
            <Terminal
              ref={terminal}
              commands={commands}
              prompt={prompt}
              className="relative min-h-0 flex-1 p-4 [scrollbar-color:rgb(255_255_255/0.2)_transparent] [scrollbar-width:thin] sm:p-6"
              banner={
                <div className="mb-4">
                  <pre aria-hidden="true" className="mb-3 font-[inherit] leading-[1.15] text-accent">
                    {winter ? <WinterLogo logo={LOGO} /> : LOGO}
                  </pre>
                  <p className="text-on-surface-muted">
                    Hi, I&apos;m <span className="text-accent">Hash</span>. Here is how I think, what I&apos;ve learned, and who I am.
                  </p>
                  <p className="text-on-surface-muted">
                    Browse with <span className="whitespace-nowrap text-white">ls posts</span>, search with{' '}
                    <span className="whitespace-nowrap text-white">grep &lt;word&gt;</span>, or ask an AI with{' '}
                    <span className="whitespace-nowrap text-white">ai &lt;question&gt;</span>.
                  </p>
                  <p className="text-on-surface-muted">
                    Type <span className="text-white">help</span> for more.
                  </p>
                  {winter && (
                    <p className="text-on-surface-muted">
                      {formatWinterGreeting(new Date())} Type <span className="text-white">snow</span> to stop the snowfall.
                    </p>
                  )}
                </div>
              }
            />
          </TerminalWindow>
        </div>
      </div>
    </section>
  );
}
