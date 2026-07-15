import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/posts"
        className="mb-6 inline-block text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        ← Back to posts
      </Link>
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : error ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Error: {error.message}
        </p>
      ) : post ? (
        <article>
          <header className="mb-8 border-b border-gray-200 pb-6">
            <p className="mb-2 text-xs font-semibold uppercase text-blue-600">
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
                      className="w-full rounded-md border border-blue-400 px-3 py-2 text-2xl font-bold text-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {updatePost.error && (
                      <p className="text-sm text-red-600">
                        {updatePost.error.message}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={updatePost.isPending}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updatePost.isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={updatePost.isPending}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-start gap-2">
                    <h1 className="break-words text-3xl font-bold text-gray-950">
                      {post.title}
                    </h1>
                    <button
                      onClick={handleEditStart}
                      aria-label="Edit title"
                      className="mt-1 shrink-0 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100"
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
              <div className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center">
                <div className="text-2xl font-semibold text-gray-950">
                  {post.viewCount}
                </div>
                <div className="text-xs font-medium uppercase text-gray-500">
                  views
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Updated {new Date(post.updatedAt).toLocaleString()}
            </p>
          </header>

          <dl className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Post ID
              </dt>
              <dd className="mt-1 break-all font-mono text-sm text-gray-900">
                {post.postId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Source ID
              </dt>
              <dd className="mt-1 break-all font-mono text-sm text-gray-900">
                {post.sourceId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                View Count
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {post.viewCount} views
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Created
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(post.createdAt).toLocaleString()}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase text-gray-500">
                Updated
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(post.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </article>
      ) : null}
    </main>
  );
}
