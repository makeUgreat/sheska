import { Link } from 'react-router-dom';
import { type PostSummary } from '@/api/client';
import { ActionLink } from '@/components/ui/action-link';
import { PostMeta } from '@/components/post/post-meta';

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
    <article className="group -mx-6 rounded-lg p-6 transition-all duration-300 hover:bg-surface-container-lowest">
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
            <Link
              to={`/posts/${post.postId}`}
              className="block font-sans text-headline-md normal-case tracking-normal text-current"
            >
              <HighlightedTitle title={post.title} query={highlight} />
            </Link>
          </h3>
          <p className="line-clamp-2 text-base leading-relaxed text-text-secondary">
            A saved note from the garden index, ready for focused reading and
            revision.
          </p>
          <ActionLink to={`/posts/${post.postId}`} className="mt-2">
            Read Note
          </ActionLink>
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
    </article>
  );
}
