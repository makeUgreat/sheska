import { TerminalWindow } from './terminal-window';

export function LandingHero({
  query,
  onQueryChange,
  totalPostCount,
  articlesHref,
  notesHref,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  totalPostCount: number;
  articlesHref: string;
  notesHref: string;
}) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-4 pb-24 pt-12">
      <div className="mb-12">
        <h1 className="select-none bg-gradient-to-r from-[#374151] to-black bg-clip-text text-[88px] font-bold leading-none tracking-tighter text-transparent sm:text-[120px] md:text-[180px]">
          HASH
        </h1>
      </div>

      <div className="relative w-full">
        <div className="z-10 mx-auto w-full max-w-container-terminal px-0 sm:px-6">
          <TerminalWindow
            prompt={
              <>
                <div className="mb-4">
                  <span className="text-secondary">visitor@hash:~$</span>{' '}
                  <span className="text-white">
                    hash-cli init --mode=explorative
                  </span>
                </div>
                <div className="mb-4 text-tertiary opacity-80">
                  Initializing HASH context...
                  <br />
                  Loading semantic nodes...
                  <br />
                  Ready for input.
                </div>
              </>
            }
            cursor={
              <div className="mt-2 flex items-center">
                <span className="text-secondary">visitor@hash:~$</span>
                <span className="ml-2 text-white">Y</span>
                <span className="ml-1 h-5 w-2 animate-pulse bg-accent" />
              </div>
            }
          >
            <div className="mb-4">
              <span className="text-secondary">visitor@hash:~$</span>{' '}
              <input
                type="search"
                aria-label="Search posts by title or content"
                placeholder="Search title or content"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                className="w-[min(100%,34rem)] bg-transparent text-white caret-accent outline-none placeholder:text-white"
              />
            </div>
            <div className="mb-4 text-accent">
              Analyzing recent thought logs...
              <br />- {totalPostCount} notes found in /posts
              <br />- Updated reading index for &quot;Generative UI&quot;
              <br />- Technical snippets synced via CLI
              <br />
              <br />
              Shall I display the latest entries? (Y/n)
            </div>
          </TerminalWindow>
        </div>

        <a
          href={notesHref}
          className="absolute -right-4 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2 text-on-secondary/30 transition-colors duration-300 ease-out animate-[bounce-x_1.5s_infinite] hover:text-accent"
        >
          <span
            className="font-mono text-xs font-medium uppercase tracking-widest"
            style={{ writingMode: 'vertical-rl' }}
          >
            Browse Notes
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
            <path d="M7 5l9 7-9 7" />
          </svg>
        </a>
      </div>

      <a
        href={articlesHref}
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-on-secondary/30 transition-colors duration-300 ease-out animate-bounce hover:text-accent"
      >
        <span className="font-mono text-xs font-medium uppercase tracking-widest">
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
      </a>
    </section>
  );
}
