import { type Ref } from 'react';
import { TerminalWindow } from '@/features/posts/components/terminal-window';
import { PostsLoading } from '@/features/posts/components/posts-loading';

export function PostsLandingView({
  query,
  onQueryChange,
  totalPostCount,
  isCatchingPostsEntry,
  isPreparingPosts,
  postsEntryRef,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  totalPostCount: number;
  isCatchingPostsEntry: boolean;
  isPreparingPosts: boolean;
  postsEntryRef: Ref<HTMLDivElement>;
}) {
  const isEntryActive = isCatchingPostsEntry || isPreparingPosts;

  return (
    <div className={isCatchingPostsEntry ? 'posts-entry-catch' : undefined}>
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-4 pb-24 pt-12">
        <div className="mb-12">
          <h1 className="select-none bg-gradient-to-r from-[#374151] to-black bg-clip-text text-[88px] font-bold leading-none tracking-tighter text-transparent sm:text-[120px] md:text-[180px]">
            HASH
          </h1>
        </div>

        <div className="z-10 w-full max-w-container-terminal px-0 sm:px-6">
          <TerminalWindow
            prompt={
              <>
                <div className="mb-4">
                  <span className="text-secondary">visitor@garden:~$</span>{' '}
                  <span className="text-white">
                    garden-cli init --mode=explorative
                  </span>
                </div>
                <div className="mb-4 text-tertiary opacity-80">
                  Initializing Digital Garden context...
                  <br />
                  Loading semantic nodes...
                  <br />
                  Ready for input.
                </div>
              </>
            }
            cursor={
              <div className="mt-2 flex items-center">
                <span className="text-secondary">visitor@garden:~$</span>
                <span className="ml-2 text-white">Y</span>
                <span className="ml-1 h-5 w-2 animate-pulse bg-accent" />
              </div>
            }
          >
            <div className="mb-4">
              <span className="text-secondary">visitor@garden:~$</span>{' '}
              <input
                type="search"
                aria-label="Search posts"
                placeholder="What's new in the garden?"
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

        {isPreparingPosts && (
          <PostsLoading
            label="Loading posts..."
            className="absolute bottom-10 left-1/2 mt-0 -translate-x-1/2 border-t-0 pt-0"
          />
        )}
        <a
          href="#posts"
          className={[
            'absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-on-secondary/30 transition-opacity duration-300 ease-out',
            isEntryActive
              ? 'pointer-events-none opacity-0'
              : 'animate-bounce opacity-100',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="font-mono text-xs font-medium uppercase tracking-widest">
            Scroll For Articles
          </span>
          <span className="text-xl leading-none">v</span>
        </a>
      </section>

      <div
        className={[
          'relative flex bg-white transition-[min-height] duration-500 ease-out',
          isPreparingPosts ? 'h-2' : 'h-10 items-center justify-center',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden={!isPreparingPosts}
      >
        {!isEntryActive && (
          <div
            id="posts"
            ref={postsEntryRef}
            className="absolute inset-x-0 bottom-0 h-10"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
