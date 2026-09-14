import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useNote } from '@/entities/note';
import { ActionLink, StatusMessage, Tag } from '@/shared/ui';

export function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: note, isLoading, error } = useNote(id);

  return (
    <main className="mx-auto min-h-screen max-w-[800px] bg-page-background px-4 py-14">
      <ActionLink to="/notes" className="mb-8">
        Back to notes
      </ActionLink>
      {isLoading ? (
        <StatusMessage tone="loading">Loading...</StatusMessage>
      ) : error ? (
        <StatusMessage tone="error">Error: {error.message}</StatusMessage>
      ) : note ? (
        <article>
          <header className="mb-10 border-b border-outline-variant/10 pb-8">
            <Tag className="mb-3 inline-block">Note</Tag>
            <h1 className="break-words text-4xl font-bold leading-tight tracking-tight text-text-primary">
              {note.title}
            </h1>
            {(note.aliases.length > 0 || note.keywords.length > 0) && (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {[...note.aliases, ...note.keywords].map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-accent"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
              Updated {new Date(note.updatedAt).toLocaleString()}
            </p>
          </header>

          <dl className="grid gap-4 rounded border border-outline-variant/10 bg-page-background p-5 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
                Note ID
              </dt>
              <dd className="mt-1 break-all font-mono text-sm text-text-primary">
                {note.noteId}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
                External Source ID
              </dt>
              <dd className="mt-1 break-all font-mono text-sm text-text-primary">
                {note.externalSourceId}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
                Created
              </dt>
              <dd className="mt-1 text-sm text-text-primary">
                {new Date(note.createdAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
                Updated
              </dt>
              <dd className="mt-1 text-sm text-text-primary">
                {new Date(note.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>

          {note.body && (
            <section className="mt-8">
              <h2 className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-text-secondary">
                Content
              </h2>
              <div className="prose prose-neutral max-w-none rounded border border-outline-variant/10 bg-page-background p-5">
                <ReactMarkdown>{note.body}</ReactMarkdown>
              </div>
            </section>
          )}
        </article>
      ) : null}
    </main>
  );
}
