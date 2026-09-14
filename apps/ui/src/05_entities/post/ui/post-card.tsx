import { Link } from 'react-router-dom';
import { type PostSummary } from '@/entities/post';
import { PostMeta } from './post-meta';

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-accent text-white">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
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
          <PostMeta
            updatedAt={post.updatedAt}
            viewCount={post.viewCount}
            similarity={post.similarity}
          />
          <h3 className="font-sans text-headline-md text-text-primary transition-colors group-hover:text-accent">
            <Highlighted text={post.title} query={highlight} />
          </h3>
          <p className="line-clamp-2 text-base leading-relaxed text-text-secondary">
            {post.snippet ? (
              <Highlighted text={post.snippet} query={highlight} />
            ) : (
              'A saved note from the garden index, ready for focused reading and revision.'
            )}
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
