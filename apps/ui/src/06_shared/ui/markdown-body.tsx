import {
  Children,
  createContext,
  type ReactNode,
  useContext,
  useMemo,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type Heading } from '../lib/parse-outline';
import { parseWikiLinks } from '../lib/parse-wiki-links';

/**
 * 모든 wiki link는 API가 resolved target을 돌려주기 전까지 unresolved 상태다.
 * Vault에서 unresolved link는 오류가 아니라 정상 상태이므로 숨기지 않고 표시한다.
 */
function UnresolvedWikiLink({ label }: { label: string }) {
  return (
    <span
      title={`${label} — no note yet`}
      className="text-accent-strong underline decoration-dotted underline-offset-2"
    >
      {label}
    </span>
  );
}

function withWikiLinks(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child !== 'string') return child;

    const tokens = parseWikiLinks(child);
    if (tokens.every((token) => token.kind === 'text')) return child;

    return (
      <>
        {tokens.map((token, index) =>
          token.kind === 'text' ? (
            token.value
          ) : (
            <UnresolvedWikiLink key={`${index}-${token.label}`} {...token} />
          ),
        )}
      </>
    );
  });
}

const FencedCodeContext = createContext(false);

function MarkdownCode({ children }: { children: ReactNode }) {
  return useContext(FencedCodeContext) ? (
    <code>{children}</code>
  ) : (
    <code className="rounded bg-outline-variant/10 px-1.5 py-0.5 font-mono text-code-snippet text-accent-strong">
      {children}
    </code>
  );
}

/** Heading anchors must land below the sticky header, not under it. */
const BELOW_HEADER =
  'scroll-mt-[calc(var(--spacing-header)+var(--spacing-gutter))]';

function createMarkdownComponents(idByLine: Map<number, string>): Components {
  const headingId = (
    node: { position?: { start: { line: number } } } | undefined,
  ) => (node?.position ? idByLine.get(node.position.start.line) : undefined);

  const SectionHeading: Components['h2'] = ({ children, node }) => (
    <h2
      id={headingId(node)}
      className={`mt-12 mb-4 ${BELOW_HEADER} font-sans text-headline-md text-text-primary`}
    >
      {withWikiLinks(children)}
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
        {withWikiLinks(children)}
      </h3>
    ),
    p: ({ children }) => (
      <p className="mb-5 text-body-md text-text-secondary">
        {withWikiLinks(children)}
      </p>
    ),
    li: ({ className, children }) =>
      className?.includes('task-list-item') ? (
        <li className="flex items-start gap-2">{withWikiLinks(children)}</li>
      ) : (
        <li>{withWikiLinks(children)}</li>
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
        {withWikiLinks(children)}
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
        {withWikiLinks(children)}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-b border-outline-variant/10 px-3 py-2 first:pl-0 last:pr-0 align-top">
        {withWikiLinks(children)}
      </td>
    ),
    ul: ({ className, children }) =>
      className?.includes('contains-task-list') ? (
        <ul className="mb-5 list-none space-y-2 pl-0 text-body-md text-text-secondary">
          {children}
        </ul>
      ) : (
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
      <FencedCodeContext.Provider value={true}>
        <pre className="my-7 overflow-x-auto rounded-lg bg-surface p-5 font-mono text-code-snippet text-on-surface">
          {children}
        </pre>
      </FencedCodeContext.Provider>
    ),
    code: MarkdownCode,
  };
}

export function MarkdownBody({
  body,
  outline,
}: {
  body: string;
  outline: readonly Heading[];
}) {
  const components = useMemo(
    () =>
      createMarkdownComponents(
        new Map(outline.map((heading) => [heading.line, heading.id])),
      ),
    [outline],
  );

  return (
    <div className="break-words">
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
