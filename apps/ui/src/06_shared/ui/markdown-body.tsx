import { useMemo } from 'react';
import { type Heading } from '../lib/parse-outline';
import { Markdown } from './markdown';
import { createMarkdownComponents } from './markdown-components';
import { remarkWikiLink } from './markdown-wiki-link';

const WIKI_LINK_PLUGINS = [remarkWikiLink];

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
      headingId: (node) =>
        node?.position ? idByLine.get(node.position.start.line) : undefined,
    });
  }, [outline]);

  return (
    <Markdown
      body={body}
      components={components}
      remarkPlugins={WIKI_LINK_PLUGINS}
    />
  );
}
