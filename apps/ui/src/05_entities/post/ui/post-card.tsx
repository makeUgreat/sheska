import { Link } from 'react-router-dom';
import { type PostSummary } from '@/entities/post';
import { PostMeta } from './post-meta';

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
}: {
  post: PostSummary;
  highlight?: string;
}) {
  return (
    <article>
      <Link
        to={`/posts/${post.postId}`}
        className="group -mx-6 block rounded-lg p-6 transition-all duration-300 hover:bg-surface-container-lowest focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
      </Link>
    </article>
  );
}
