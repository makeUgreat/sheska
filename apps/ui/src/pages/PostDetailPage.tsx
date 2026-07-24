import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { usePost, useUpdatePost } from '@/api/queries';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: post, isLoading, error } = usePost(id);
  const updatePost = useUpdatePost(id ?? '');

  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');

  function handleEditStart() {
    setDraftTitle(post?.title ?? '');
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleSave() {
    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed === post?.title) {
      setEditing(false);
      return;
    }
    updatePost.mutate(
      { title: trimmed },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  }

  return (
    <main className="mx-auto min-h-screen max-w-[800px] bg-page-background px-4 py-14">
      <Link
        to="/posts"
        className="mb-8 inline-block font-mono text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-[#e06c75]"
      >
        ← Back to posts
      </Link>
      {isLoading ? (
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-text-muted">
          Loading...
        </p>
      ) : error ? (
        <p
          role="alert"
          className="rounded bg-error-container px-4 py-3 font-mono text-sm text-on-error-container"
        >
          Error: {error.message}
        </p>
      ) : post ? (
        <article>
          <header className="mb-10 border-b border-outline-variant/10 pb-8">
            <p className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-[#e06c75]">
              Post
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                {editing ? (
                  <div className="flex flex-col gap-2">
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      maxLength={200}
                      className="w-full rounded border border-[#3e4451] bg-[#121418] px-3 py-2 text-2xl font-bold text-white focus:border-[#e06c75] focus:outline-none"
                    />
                    {updatePost.error && (
                      <p className="text-sm text-error-container">
                        {updatePost.error.message}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={updatePost.isPending}
                        className="rounded bg-[#e06c75] px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                      >
                        {updatePost.isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={updatePost.isPending}
                        className="rounded border border-[#e06c75] px-3 py-1.5 text-sm font-medium text-[#e06c75] hover:bg-[#e06c75] hover:text-white disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-start gap-2">
                    <h1 className="break-words text-4xl font-bold leading-tight tracking-tight text-text-primary">
                      {post.title}
                    </h1>
                    <button
                      onClick={handleEditStart}
                      aria-label="Edit title"
                      className="mt-1 shrink-0 rounded p-1 text-text-secondary opacity-0 transition-opacity hover:bg-[#282c34] hover:text-[#e06c75] group-hover:opacity-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="shrink-0 rounded border border-outline-variant/10 bg-surface-container-lowest px-4 py-3 text-center">
                <div className="text-2xl font-semibold text-white">
                  {post.viewCount}
                </div>
                <div className="font-mono text-xs font-medium uppercase tracking-widest text-[#abb2bf]">
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
