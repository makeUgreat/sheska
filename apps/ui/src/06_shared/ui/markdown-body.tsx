import { Children, type ReactNode, useMemo } from 'react';
import { type Heading } from '../lib/parse-outline';
import { parseWikiLinks } from '../lib/parse-wiki-links';
import { Markdown } from './markdown';
import { createMarkdownComponents } from './markdown-components';

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

/** 상세 화면 본문은 이 컴포넌트를 거쳐 wiki link와 heading anchor를 함께 얻는다. */
export function MarkdownBody({
  body,
  outline,
}: {
  body: string;
  outline: readonly Heading[];
}) {
  const components = useMemo(() => {
    const idByLine = new Map(
      outline.map((heading) => [heading.line, heading.id]),
    );

    return createMarkdownComponents({
      decorateText: withWikiLinks,
      headingId: (node) =>
        node?.position ? idByLine.get(node.position.start.line) : undefined,
    });
  }, [outline]);

  return <Markdown body={body} components={components} />;
}
