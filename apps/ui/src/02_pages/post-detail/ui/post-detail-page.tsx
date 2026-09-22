import { useParams } from 'react-router-dom';
import { usePost } from '@/entities/post';
import {
  BackLink,
  EmptyState,
  ErrorState,
  LoadingState,
  Markdown,
  Tag,
} from '@/shared/ui';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: post, isLoading, error } = usePost(id);

  return (
    <main className="mx-auto min-h-screen max-w-content bg-page-background px-4 py-14">
      <div className="mx-auto max-w-measure">
        <BackLink to="/posts" className="mb-8">
          Back to posts
        </BackLink>
        {isLoading ? (
          <LoadingState className="py-24" />
        ) : error ? (
          <ErrorState error={error} />
        ) : post ? (
          <article>
            <header className="mb-10 border-b border-outline-variant/10 pb-8">
              <Tag className="mb-3 inline-block">Post</Tag>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h1 className="break-words text-4xl font-bold leading-tight tracking-tight text-text-primary">
                    {post.title}
                  </h1>
                </div>
                <div className="shrink-0 rounded border border-outline-variant/10 bg-surface-container-lowest px-4 py-3 text-center">
                  <div className="text-2xl font-semibold text-white">
                    {post.viewCount}
                  </div>
                  <div className="font-mono text-label-sm uppercase text-text-secondary">
                    views
                  </div>
                </div>
              </div>
              <p className="mt-4 font-mono text-label-sm uppercase text-text-secondary">
                Updated {new Date(post.updatedAt).toLocaleString()}
              </p>
            </header>

            <dl className="grid gap-4 rounded border border-outline-variant/10 bg-page-background p-5 sm:grid-cols-2">
              <div>
                <dt className="font-mono text-label-sm uppercase text-text-secondary">
                  Post ID
                </dt>
                <dd className="mt-1 break-all font-mono text-code-snippet text-text-primary">
                  {post.postId}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-label-sm uppercase text-text-secondary">
                  Source ID
                </dt>
                <dd className="mt-1 break-all font-mono text-code-snippet text-text-primary">
                  {post.sourceId}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-label-sm uppercase text-text-secondary">
                  View Count
                </dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {post.viewCount} views
                </dd>
              </div>
              <div>
                <dt className="font-mono text-label-sm uppercase text-text-secondary">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {new Date(post.createdAt).toLocaleString()}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-mono text-label-sm uppercase text-text-secondary">
                  Updated
                </dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {new Date(post.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>

            {post.body && (
              <section className="mt-8">
                <h2 className="mb-3 font-mono text-label-sm uppercase text-text-secondary">
                  Content
                </h2>
                <Markdown
                  body={post.body}
                  className="rounded border border-outline-variant/10 bg-page-background p-5"
                />
              </section>
            )}
          </article>
        ) : (
          <EmptyState variant="document" className="py-24" />
        )}
      </div>
    </main>
  );
}
