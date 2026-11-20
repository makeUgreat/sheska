import { type ReactNode } from 'react';
import { type Heading } from '../lib/markdown';
import { LINE_IN, lineDelay } from './line-in';
import { Markdown } from './markdown';
import { TableOfContents } from './table-of-contents';

const OUTLINE_MINIMUM_HEADINGS = 2;

const FADE_RULE = 'bg-linear-to-r from-outline-variant/26 via-outline-variant/8 via-60% to-transparent';

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
        <header className={`mb-6 ${LINE_IN}`} style={lineDelay(0)}>
          {header}
        </header>

        <hr className={`mb-12 h-px border-0 ${FADE_RULE} ${LINE_IN}`} style={lineDelay(1)} />

        {body && (
          <div className={LINE_IN} style={lineDelay(2)}>
            <Markdown body={body} />
          </div>
        )}

        {footer}
      </article>

      {outline.length >= OUTLINE_MINIMUM_HEADINGS && <TableOfContents headings={outline} activeId={activeHeadingId} />}
    </>
  );
}
