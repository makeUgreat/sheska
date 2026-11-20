import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { hasCodeBlock, MARKDOWN_PLUGINS, parseMarkdown } from '../../lib/markdown';
import { MARKDOWN_COMPONENTS } from './markdown-components';
import { type RehypePlugins } from './markdown-highlight';

const NO_PLUGINS: RehypePlugins = [];

/**
 * Highlighter는 무거워서 code fence가 없는 글까지 받게 하면 첫 화면이 늦어진다.
 * 본문을 먼저 보여 주고, fence가 있는 글에서만 받아 색을 입힌다.
 * 목록이나 callout 안에 들여 쓴 fence도 놓치지 않도록 줄 모양이 아니라 트리의 code node로 판정한다.
 */
function useHighlightPlugins(body: string) {
  const [plugins, setPlugins] = useState(NO_PLUGINS);
  const needsHighlight = useMemo(() => hasCodeBlock(parseMarkdown(body)), [body]);

  useEffect(() => {
    if (!needsHighlight) return;

    let live = true;
    void import('./markdown-highlight').then(({ highlightPlugin }) => {
      if (live) setPlugins([highlightPlugin]);
    });

    return () => {
      live = false;
    };
  }, [needsHighlight]);

  return plugins;
}

/**
 * 본문 위 여백은 감싸는 쪽이 정한다. 첫 block의 margin이 남으면 padding에 더해져
 * 여백이 두 배가 되고, 글이 제목으로 시작하는지 문단으로 시작하는지에 따라 높이도 달라진다.
 *
 * `word-break: normal`은 한글을 음절 단위로 줄바꿈해서 단어 중간이 잘린다.
 *
 * 넓은 화면에서는 본문 바로 아래 목록의 기호를 왼쪽 여백에 건다. 중첩 목록은 들여쓰기로 깊이를 보여야 하므로 남긴다.
 */
const BODY = 'break-words break-keep [&>*:first-child]:mt-0 margin-label:[&>ul]:pl-0 margin-label:[&>ol]:pl-0';

export function Markdown({ body, className = '' }: { body: string; className?: string }) {
  return (
    <div className={[BODY, className].filter(Boolean).join(' ')}>
      <ReactMarkdown components={MARKDOWN_COMPONENTS} remarkPlugins={MARKDOWN_PLUGINS} rehypePlugins={useHighlightPlugins(body)}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
