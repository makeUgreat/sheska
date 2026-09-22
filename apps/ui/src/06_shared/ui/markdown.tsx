import { useEffect, useState } from 'react';
import ReactMarkdown, { type Components, type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createMarkdownComponents } from './markdown-components';
import { type RehypePlugins } from './markdown-highlight';

const DEFAULT_COMPONENTS = createMarkdownComponents();

const NO_PLUGINS: RehypePlugins = [];

type RemarkPlugins = NonNullable<Options['remarkPlugins']>;

const NO_REMARK_PLUGINS: RemarkPlugins = [];

/** Fence는 줄 맨 앞에서 최대 3칸까지 들여쓸 수 있고 물결표로도 연다. */
const CODE_FENCE = /^ {0,3}(```|~~~)/m;

/** Highlighter가 도착하기 전까지 fence는 색 없이 보이고, 도착하면 한 번 더 그린다. */
function useHighlightPlugins(body: string) {
  const [plugins, setPlugins] = useState(NO_PLUGINS);

  useEffect(() => {
    if (!CODE_FENCE.test(body)) return;

    let live = true;
    void import('./markdown-highlight').then(({ highlightPlugin }) => {
      if (live) setPlugins([highlightPlugin]);
    });

    return () => {
      live = false;
    };
  }, [body]);

  return plugins;
}

/**
 * 본문을 감싼 box에 padding이 있으면 첫 block의 위 margin이 상쇄되지 못하고
 * padding 위에 그대로 얹힌다. 첫 block만 붙이고 나머지 간격은 그대로 둔다.
 */
const BODY = 'break-words [&>*:first-child]:mt-0';

/** 모든 본문 Markdown은 이 컴포넌트를 거쳐 같은 typography를 쓴다. */
export function Markdown({
  body,
  components = DEFAULT_COMPONENTS,
  remarkPlugins = NO_REMARK_PLUGINS,
  className = '',
}: {
  body: string;
  components?: Components;
  remarkPlugins?: RemarkPlugins;
  className?: string;
}) {
  return (
    <div className={[BODY, className].filter(Boolean).join(' ')}>
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm, ...remarkPlugins]}
        rehypePlugins={useHighlightPlugins(body)}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
