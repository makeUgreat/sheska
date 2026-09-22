import { type ReactNode } from 'react';
import { type Heading } from '../lib/parse-outline';
import { ArticleOutline } from './article-outline';
import { MarkdownBody } from './markdown-body';

const OUTLINE_MINIMUM_HEADINGS = 2;

const BLEEDS_INTO_THE_PAGE_GUTTER = '-mx-4 px-4';

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
        <header
          className={`mb-12 rounded-lg bg-outline-variant/4 py-7 ${BLEEDS_INTO_THE_PAGE_GUTTER}`}
        >
          {header}
        </header>

        {body && <MarkdownBody body={body} outline={outline} />}

        {footer}
      </article>

      {outline.length >= OUTLINE_MINIMUM_HEADINGS && (
        <ArticleOutline headings={outline} activeId={activeHeadingId} />
      )}
    </>
  );
}
