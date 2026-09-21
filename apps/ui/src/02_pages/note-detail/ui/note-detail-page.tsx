import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown, { type Components } from 'react-markdown';
import { Link } from 'react-router-dom';
import { useNote } from '@/entities/note';
import { ActionLink, StatusMessage } from '@/shared/ui';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h2 className="mt-12 mb-4 font-sans text-headline-md text-text-primary">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 mb-4 font-sans text-headline-md text-text-primary">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 mb-3 font-sans text-body-lg font-semibold text-text-primary">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-5 text-body-md text-text-secondary">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-5 list-disc space-y-2 pl-5 text-body-md text-text-secondary marker:text-outline-variant">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 list-decimal space-y-2 pl-5 text-body-md text-text-secondary marker:text-outline-variant">
      {children}
    </ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-7 border-l-2 border-accent/40 pl-5 text-body-md italic text-text-secondary">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-outline-variant/20" />,
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-accent-strong underline underline-offset-2 transition-colors hover:text-accent-hover"
    >
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="my-7 overflow-x-auto rounded-lg bg-surface p-5 font-mono text-code-snippet text-on-surface">
      {children}
    </pre>
  ),
  code: ({ className, children }) =>
    className?.startsWith('language-') ? (
      <code className="font-mono text-code-snippet">{children}</code>
    ) : (
      <code className="rounded bg-outline-variant/10 px-1.5 py-0.5 font-mono text-code-snippet text-accent-strong">
        {children}
      </code>
    ),
};

function useOutline(body: string | undefined) {
  return useMemo(() => {
    if (!body) return [];
    return body
      .split('\n')
      .map((line) => /^(#{2,3})\s+(.+?)\s*$/.exec(line))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => ({ depth: match[1].length, text: match[2] }));
  }, [body]);
}

export function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: note, isLoading, error } = useNote(id);
  const outline = useOutline(note?.body);

  return (
    <main className="min-h-screen bg-page-background px-4 py-14">
      <div className="mx-auto max-w-[1120px]">
        <ActionLink to="/notes" className="mb-10">
          Back to notes
        </ActionLink>

        {isLoading ? (
          <StatusMessage tone="loading">Loading...</StatusMessage>
        ) : error ? (
          <StatusMessage tone="error">Error: {error.message}</StatusMessage>
        ) : note ? (
          <div className="grid gap-14 lg:grid-cols-[minmax(0,680px)_200px] lg:justify-center">
            <article className="min-w-0">
              <header className="mb-10">
                <h1 className="break-words font-sans text-headline-lg text-text-primary">
                  {note.title}
                </h1>
                {note.aliases.length > 0 && (
                  <p className="mt-4 font-mono text-label-sm">
                    <span className="uppercase text-text-muted">
                      also known as{' '}
                    </span>
                    {note.aliases.map((alias, index) => (
                      <span key={alias}>
                        {index > 0 && (
                          <span className="text-text-muted"> / </span>
                        )}
                        <span className="text-accent-strong">{alias}</span>
                      </span>
                    ))}
                  </p>
                )}
                <p className="mt-3 font-mono text-label-sm uppercase text-text-muted">
                  Updated {formatDate(note.updatedAt)}
                </p>
              </header>

              <hr className="mb-10 border-outline-variant/20" />

              {note.body && (
                <div className="break-words">
                  <ReactMarkdown components={markdownComponents}>
                    {note.body}
                  </ReactMarkdown>
                </div>
              )}

              <footer className="mt-16 border-t border-outline-variant/20 pt-6">
                {note.keywords.length > 0 && (
                  <p className="mb-4 font-mono text-label-sm">
                    <span className="uppercase text-text-muted">topics </span>
                    {note.keywords.map((keyword, index) => (
                      <span key={keyword}>
                        {index > 0 && (
                          <span className="text-text-muted"> / </span>
                        )}
                        <span className="text-text-secondary">{keyword}</span>
                      </span>
                    ))}
                  </p>
                )}
                <p className="font-mono text-label-sm text-text-muted">
                  <span className="uppercase">source </span>
                  <span>{note.externalSourceId}</span>
                  <span> · </span>
                  <Link
                    to={`/sources/${note.noteId}`}
                    className="text-accent-strong transition-colors hover:text-accent-hover"
                  >
                    open source
                  </Link>
                </p>
              </footer>
            </article>

            {outline.length > 1 && (
              <nav aria-label="On this page" className="hidden lg:block">
                <div className="sticky top-14">
                  <p className="mb-3 font-mono text-label-sm uppercase text-text-muted">
                    On this page
                  </p>
                  <ul className="space-y-2 border-l border-outline-variant/20 pl-4">
                    {outline.map((heading, index) => (
                      <li
                        key={`${heading.text}-${index}`}
                        className={
                          heading.depth === 3
                            ? 'pl-3 text-label-sm text-text-muted'
                            : 'text-label-sm text-text-secondary'
                        }
                      >
                        {heading.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
