import { Link } from 'react-router-dom';
import { type PostSummary } from '@/entities/posts/api/types';
import { PostMeta } from '@/features/posts/components/post-meta';

function HighlightedTitle({ title, query }: { title: string; query: string }) {
  if (!query) return <>{title}</>;

  const index = title.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{title}</>;

  return (
    <>
      {title.slice(0, index)}
      <mark className="bg-accent text-white">
        {title.slice(index, index + query.length)}
      </mark>
      {title.slice(index + query.length)}
    </>
  );
}

export function PostCard({
  post,
  highlight = '',
  thumbnailUrl,
}: {
  post: PostSummary;
  highlight?: string;
  thumbnailUrl?: string;
}) {
  return (
    <article>
      <Link
        to={`/posts/${post.postId}`}
        className="group -mx-6 block rounded-lg p-6 transition-all duration-300 hover:bg-surface-container-lowest focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <div
          className={
            thumbnailUrl
              ? 'grid gap-8 md:grid-cols-[1fr_200px]'
              : 'flex flex-col gap-2'
          }
        >
          <div className="flex flex-col gap-2">
            <PostMeta updatedAt={post.updatedAt} viewCount={post.viewCount} />
            <h3 className="font-sans text-headline-md text-text-primary transition-colors group-hover:text-accent">
              <HighlightedTitle title={post.title} query={highlight} />
            </h3>
            <p className="line-clamp-2 text-base leading-relaxed text-text-secondary">
              A saved note from the garden index, ready for focused reading and
              revision.
            </p>
            <span className="mt-2 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-accent">
              <span>Read Note</span>
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1"
              >
                -&gt;
              </span>
            </span>
          </div>

          {thumbnailUrl && (
            <div className="hidden md:block">
              <div className="aspect-square w-full overflow-hidden rounded bg-surface-container-low">
                <img
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src={thumbnailUrl}
                />
              </div>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
