import { type ReactNode } from 'react';
import { type Components } from 'react-markdown';
import { CodeBlock, useInsideCodeBlock } from './code-block';
import { WIKI_LINK_ELEMENT } from '../../lib/markdown';
import { WikiLink } from './obsidian/wiki-link';

/** Anchor로 이동하면 목적지가 sticky header 뒤에 가려진다. */
const BELOW_HEADER =
  'scroll-mt-[calc(var(--spacing-header)+var(--spacing-gutter))]';

/**
 * Loose list도 tight list 간격으로 그린다.
 * 항목 안의 코드 블록과 표는 본문용 간격을 쓰면 어느 항목에 속하는지 흐려진다.
 */
const LIST_BASE =
  'mb-5 space-y-1.5 text-body-md text-text-secondary ' +
  '[&_li>p]:mb-0 [&_ul]:mt-1.5 [&_ul]:mb-0 [&_ol]:mt-1.5 [&_ol]:mb-0 ' +
  '[&_li>div]:mt-2 [&_li>div]:mb-4';

function anchored(id: string | undefined, className: string) {
  return id ? `${className} ${BELOW_HEADER}`.trim() : className;
}

/** Fence 안의 code는 highlighter가 붙인 class를 그대로 들고 가야 token ink가 걸린다. */
function CodeText({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return useInsideCodeBlock() ? (
    <code className={className}>{children}</code>
  ) : (
    <code className="rounded bg-outline-variant/10 px-1.5 py-0.5 font-mono text-code-snippet text-accent-strong">
      {children}
    </code>
  );
}

const HEADING_STYLE = {
  h2: 'mt-12 mb-4 font-sans text-headline-md text-text-primary',
  h3: 'mt-8 mb-3 font-sans text-body-lg font-semibold text-text-primary',
  h4: 'mt-6 mb-2 font-sans text-body-md font-semibold text-text-primary',
  h5: 'mt-5 mb-2 font-sans text-body-md font-semibold text-text-secondary',
  h6: 'mt-4 mb-2 font-mono text-label-sm uppercase text-text-muted',
} as const;

type HeadingTag = keyof typeof HEADING_STYLE;

/** 본문은 page 제목 `<h1>` 아래에 놓이므로 모든 heading을 한 단계씩 낮춘다. */
const HeadingBelowTitle = (Tag: HeadingTag): Components['h1'] =>
  function Heading({ children, id }) {
    return (
      <Tag id={id} className={`${HEADING_STYLE[Tag]} ${BELOW_HEADER}`}>
        {children}
      </Tag>
    );
  };

const components: Components = {
  h1: HeadingBelowTitle('h2'),
  h2: HeadingBelowTitle('h3'),
  h3: HeadingBelowTitle('h4'),
  h4: HeadingBelowTitle('h5'),
  h5: HeadingBelowTitle('h6'),
  h6: HeadingBelowTitle('h6'),
  p: ({ id, children }) => (
    <p
      id={id}
      className={anchored(id, 'mb-5 text-body-md text-text-secondary')}
    >
      {children}
    </p>
  ),
  li: ({ className, children, id }) =>
    className?.includes('task-list-item') ? (
      <li id={id} className={anchored(id, 'flex items-start gap-2')}>
        {children}
      </li>
    ) : (
      <li id={id} className={id ? BELOW_HEADER : undefined}>
        {children}
      </li>
    ),
  input: ({ checked }) => (
    <input
      type="checkbox"
      checked={checked}
      disabled
      className="mt-1 h-3.5 w-3.5 shrink-0 accent-accent-strong"
    />
  ),
  del: ({ children }) => (
    <del className="text-text-muted line-through">{children}</del>
  ),
  table: ({ id, children }) => (
    <div id={id} className={anchored(id, 'my-7 overflow-x-auto')}>
      <table className="w-full border-collapse text-left text-body-md text-text-secondary">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-outline-variant/20 px-3 py-2 first:pl-0 last:pr-0 font-mono text-label-sm font-normal uppercase text-text-muted">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-outline-variant/10 px-3 py-2 first:pl-0 last:pr-0 align-top">
      {children}
    </td>
  ),
  ul: ({ className, children, id }) =>
    className?.includes('contains-task-list') ? (
      <ul id={id} className={anchored(id, `${LIST_BASE} list-none pl-0`)}>
        {children}
      </ul>
    ) : (
      <ul
        id={id}
        className={anchored(
          id,
          `${LIST_BASE} list-disc pl-4 marker:text-outline-variant`,
        )}
      >
        {children}
      </ul>
    ),
  ol: ({ id, children }) => (
    <ol
      id={id}
      className={anchored(
        id,
        `${LIST_BASE} list-decimal pl-4 marker:text-outline-variant`,
      )}
    >
      {children}
    </ol>
  ),
  blockquote: ({ id, children }) => (
    <blockquote
      id={id}
      className={anchored(
        id,
        'my-7 border-l-2 border-accent/40 pl-5 text-body-md italic text-text-secondary',
      )}
    >
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="mx-auto my-12 h-px w-18 border-0 bg-outline-variant/30" />
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-accent-strong underline underline-offset-2 transition-colors hover:text-accent-hover"
    >
      {children}
    </a>
  ),
  pre: CodeBlock,
  code: CodeText,
};

/**
 * Heading id를 여기서 따로 만들지 않는다. 목차 링크와 어긋나지 않으려면
 * `remarkHeadingId`가 트리에 새긴 값을 그대로 받아야 한다.
 */
export const MARKDOWN_COMPONENTS = {
  ...components,
  [WIKI_LINK_ELEMENT]: WikiLink,
} as Components;
