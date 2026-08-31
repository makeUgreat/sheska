import { useState, type KeyboardEvent } from 'react';
import { type GetPostResponse, useUpdatePost } from '@/entities/post';

export function UpdatePostTitle({ post }: { post: GetPostResponse }) {
  const updatePost = useUpdatePost(post.postId);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');

  function handleEditStart() {
    setDraftTitle(post.title);
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleSave() {
    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed === post.title) {
      setEditing(false);
      return;
    }
    updatePost.mutate(
      { title: trimmed },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <input
          autoFocus
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={200}
          className="w-full rounded border border-border-subtle bg-surface-container-lowest px-3 py-2 text-2xl font-bold text-text-primary focus:border-accent focus:outline-none"
        />
        {updatePost.error && (
          <p className="text-sm text-error">{updatePost.error.message}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={updatePost.isPending}
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {updatePost.isPending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            disabled={updatePost.isPending}
            className="rounded border border-accent px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2">
      <h1 className="break-words text-4xl font-bold leading-tight tracking-tight text-text-primary">
        {post.title}
      </h1>
      <button
        onClick={handleEditStart}
        aria-label="Edit title"
        className="mt-1 shrink-0 rounded p-1 text-text-secondary opacity-0 transition-opacity hover:bg-surface-container-lowest hover:text-accent group-hover:opacity-100"
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
  );
}
