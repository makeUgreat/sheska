import { CARD_LINK_TITLE, CardLink } from '@/shared/ui';
import { type PostSummary } from '../api/types';
import { PostMeta } from './post-meta';

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-accent-strong text-white">
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
      <CardLink to={`/posts/${post.postId}`} className="-mx-4 px-4 py-6">
        <div className="flex flex-col gap-2">
          <PostMeta
            updatedAt={post.updatedAt}
            viewCount={post.viewCount}
            similarity={post.similarity}
          />
          <h3
            className={`break-words font-sans text-headline-md text-text-primary ${CARD_LINK_TITLE}`}
          >
            <Highlighted text={post.title} query={highlight} />
          </h3>
          <p className="line-clamp-2 text-body-md text-text-secondary">
            {post.snippet ? (
              <Highlighted text={post.snippet} query={highlight} />
            ) : (
              'A saved note from the HASH index, ready for focused reading and revision.'
            )}
          </p>
          <span className="mt-2 inline-flex items-center gap-2 font-mono text-label-sm font-bold uppercase text-accent-strong">
            <span>Read Note</span>
            <span
              aria-hidden="true"
              className="transition-transform group-hover/card:translate-x-1"
            >
              -&gt;
            </span>
          </span>
        </div>
      </CardLink>
    </article>
  );
}
