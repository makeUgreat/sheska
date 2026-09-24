import { type ReactNode } from 'react';
import { type Heading } from '../lib/markdown';
import { Markdown } from './markdown';
import { ArticleOutline } from './article-outline';

const OUTLINE_MINIMUM_HEADINGS = 2;

const FADE_RULE =
  'bg-linear-to-r from-outline-variant/26 via-outline-variant/8 via-60% to-transparent';

export function ArticleLayout({
  header,
  body,
  outline,
  activeHeadingId,
  footer,
}: {
  header: ReactNode;
  body: string;
  outline: readonly Heading[];
  activeHeadingId: string | null;
  footer?: ReactNode;
}) {
  return (
    <>
      <article>
        <header className="mb-6">{header}</header>

        <hr className={`mb-12 h-px border-0 ${FADE_RULE}`} />

        {body && <Markdown body={body} />}

        {footer}
      </article>

      {outline.length >= OUTLINE_MINIMUM_HEADINGS && (
        <ArticleOutline headings={outline} activeId={activeHeadingId} />
      )}
    </>
  );
}
