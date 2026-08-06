import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { usePost } from '@/entities/post';
import { UpdatePostTitle } from '@/features/update-post-title';
import { ActionLink, StatusMessage, Tag } from '@/shared/ui';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: post, isLoading, error } = usePost(id);

  return (
    <main className="mx-auto min-h-screen max-w-[800px] bg-page-background px-4 py-14">
      <ActionLink to="/posts" className="mb-8">
        Back to posts
      </ActionLink>
      {isLoading ? (
        <StatusMessage tone="loading">Loading...</StatusMessage>
      ) : error ? (
        <StatusMessage tone="error">Error: {error.message}</StatusMessage>
      ) : post ? (
        <article>
          <header className="mb-10 border-b border-outline-variant/10 pb-8">
            <Tag className="mb-3 inline-block">Post</Tag>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <UpdatePostTitle post={post} />
              </div>
              <div className="shrink-0 rounded border border-outline-variant/10 bg-surface-container-lowest px-4 py-3 text-center">
                <div className="text-2xl font-semibold text-white">
                  {post.viewCount}
                </div>
                <div className="font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
                  views
                </div>
              </div>
            </div>
            <p className="mt-4 font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
              Updated {new Date(post.updatedAt).toLocaleString()}
            </p>
          </header>

          <dl className="grid gap-4 rounded border border-outline-variant/10 bg-page-background p-5 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
                Post ID
              </dt>
              <dd className="mt-1 break-all font-mono text-sm text-text-primary">
                {post.postId}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
                Source ID
              </dt>
              <dd className="mt-1 break-all font-mono text-sm text-text-primary">
                {post.sourceId}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
                View Count
              </dt>
              <dd className="mt-1 text-sm text-text-primary">
                {post.viewCount} views
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
                Created
              </dt>
              <dd className="mt-1 text-sm text-text-primary">
                {new Date(post.createdAt).toLocaleString()}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
                Updated
              </dt>
              <dd className="mt-1 text-sm text-text-primary">
                {new Date(post.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>

          {post.sourceContent && (
            <section className="mt-8">
              <h2 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
                Content
              </h2>
              <div className="prose prose-neutral max-w-none rounded border border-outline-variant/10 bg-page-background p-5">
                <ReactMarkdown>{post.sourceContent}</ReactMarkdown>
              </div>
            </section>
          )}
        </article>
      ) : null}
    </main>
  );
}
