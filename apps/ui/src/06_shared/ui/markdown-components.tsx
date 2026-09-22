import { type ReactNode } from 'react';
import { type Components } from 'react-markdown';

/** Heading anchor로 이동할 때 sticky header 아래에 멈추게 한다. */
const BELOW_HEADER =
  'scroll-mt-[calc(var(--spacing-header)+var(--spacing-gutter))]';

/**
 * 항목 사이에 빈 줄이 있으면 CommonMark가 각 항목을 <p>로 감싸고, 중첩 list는
 * 자기 아래 margin을 따로 가진다. 둘 다 여기서 없애 목록 간격이 본문을 어떻게
 * 타이핑했는지에 따라 달라지지 않게 한다.
 */
const LIST_BASE =
  'mb-5 space-y-1.5 text-body-md text-text-secondary ' +
  '[&_li>p]:mb-0 [&_ul]:mt-1.5 [&_ul]:mb-0 [&_ol]:mt-1.5 [&_ol]:mb-0';

type MarkdownNode = { position?: { start: { line: number } } };

export type MarkdownComponentOptions = {
  /** 모든 inline text 자리를 감싼다. 본문마다 다른 link 문법을 여기서 처리한다. */
  decorateText?: (children: ReactNode) => ReactNode;
  headingId?: (node?: MarkdownNode) => string | undefined;
};

export function createMarkdownComponents({
  decorateText = (children) => children,
  headingId = () => undefined,
}: MarkdownComponentOptions = {}): Components {
  /** 본문은 page 제목 아래에 놓이므로 최상위 heading을 h2로 낮춘다. */
  const SectionHeading: Components['h2'] = ({ children, node }) => (
    <h2
      id={headingId(node)}
      className={`mt-12 mb-4 ${BELOW_HEADER} font-sans text-headline-md text-text-primary`}
    >
      {decorateText(children)}
    </h2>
  );

  return {
    h1: SectionHeading,
    h2: SectionHeading,
    h3: ({ children, node }) => (
      <h3
        id={headingId(node)}
        className={`mt-8 mb-3 ${BELOW_HEADER} font-sans text-body-lg font-semibold text-text-primary`}
      >
        {decorateText(children)}
      </h3>
    ),
    p: ({ children }) => (
      <p className="mb-5 text-body-md text-text-secondary">
        {decorateText(children)}
      </p>
    ),
    li: ({ className, children }) =>
      className?.includes('task-list-item') ? (
        <li className="flex items-start gap-2">{decorateText(children)}</li>
      ) : (
        <li>{decorateText(children)}</li>
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
      <del className="text-text-muted line-through">
        {decorateText(children)}
      </del>
    ),
    table: ({ children }) => (
      <div className="my-7 overflow-x-auto">
        <table className="w-full border-collapse text-left text-body-md text-text-secondary">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border-b border-outline-variant/20 px-3 py-2 first:pl-0 last:pr-0 font-mono text-label-sm font-normal uppercase text-text-muted">
        {decorateText(children)}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-b border-outline-variant/10 px-3 py-2 first:pl-0 last:pr-0 align-top">
        {decorateText(children)}
      </td>
    ),
    ul: ({ className, children }) =>
      className?.includes('contains-task-list') ? (
        <ul className={`${LIST_BASE} list-none pl-0`}>{children}</ul>
      ) : (
        <ul
          className={`${LIST_BASE} list-disc pl-4 marker:text-outline-variant`}
        >
          {children}
        </ul>
      ),
    ol: ({ children }) => (
      <ol
        className={`${LIST_BASE} list-decimal pl-4 marker:text-outline-variant`}
      >
        {children}
      </ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-7 border-l-2 border-accent/40 pl-5 text-body-md italic text-text-secondary">
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
    pre: ({ children }) => (
      <pre className="my-7 overflow-x-auto rounded-lg bg-surface p-5 font-mono text-code-block text-on-surface">
        {children}
      </pre>
    ),
    /** Fence 안의 code는 highlighter가 붙인 class를 그대로 들고 가야 token ink가 걸린다. */
    code: ({ className, children }) =>
      className?.includes('language-') ? (
        <code className={className}>{children}</code>
      ) : (
        <code className="rounded bg-outline-variant/10 px-1.5 py-0.5 font-mono text-code-snippet text-accent-strong">
          {children}
        </code>
      ),
  };
}
