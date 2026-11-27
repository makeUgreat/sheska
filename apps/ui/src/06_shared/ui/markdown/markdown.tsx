import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { hasCodeBlock, hasMath, MARKDOWN_PLUGINS, parseMarkdown } from '../../lib/markdown';
import { MARKDOWN_COMPONENTS } from './markdown-components';
import { type RehypePlugins } from './markdown-highlight';
import { rehypeSection } from './rehype-section';
import { useSectionFocus } from './use-section-focus';

type RehypePlugin = RehypePlugins[number];

type Loader = () => Promise<RehypePlugin>;

/** `import()`는 이미 받은 module도 비동기로 돌려준다. 기억해 두지 않으면 글을 열 때마다 plugin 없는 첫 화면이 한 번 보인다. */
const loadedPlugins = new Map<Loader, RehypePlugin>();

/** 받는 동안에는 본문을 plugin 없이 먼저 보여 준다. */
function useLazyPlugin(needed: boolean, load: Loader) {
  const [plugin, setPlugin] = useState(() => loadedPlugins.get(load));

  useEffect(() => {
    if (!needed || plugin) return;

    let live = true;
    void load().then((loaded) => {
      loadedPlugins.set(load, loaded);
      if (live) setPlugin(() => loaded);
    });

    return () => {
      live = false;
    };
  }, [needed, plugin, load]);

  return plugin;
}

const loadHighlight = () => import('./markdown-highlight').then(({ highlightPlugin }) => highlightPlugin);

const loadMath = () => import('./markdown-math').then(({ mathPlugin }) => mathPlugin);

/**
 * Highlighter와 KaTeX는 무거워서 필요 없는 글까지 받게 하면 첫 화면이 늦어진다.
 * 본문을 먼저 보여 주고, code fence나 수식이 있는 글에서만 받아 입힌다.
 * 목록이나 callout 안에 들여 쓴 fence와 수식도 놓치지 않도록 줄 모양이 아니라 트리의 node로 판정한다.
 * KaTeX가 먼저 돌아야 수식 block이 highlighter에 code fence로 읽히지 않는다.
 */
function useRehypePlugins(body: string) {
  const tree = useMemo(() => parseMarkdown(body), [body]);
  const math = useLazyPlugin(hasMath(tree), loadMath);
  const highlight = useLazyPlugin(hasCodeBlock(tree), loadHighlight);

  return useMemo(() => [rehypeSection, ...[math, highlight].filter((plugin) => plugin !== undefined)], [math, highlight]);
}

/**
 * 본문 위 여백은 감싸는 쪽이 정한다. 첫 block의 margin이 남으면 padding에 더해져
 * 여백이 두 배가 되고, 글이 제목으로 시작하는지 문단으로 시작하는지에 따라 높이도 달라진다.
 *
 * `word-break: normal`은 한글을 음절 단위로 줄바꿈해서 단어 중간이 잘린다.
 *
 * 제목 아래 글은 `<section>` 안에 든다. 본문 바로 아래 block을 고르는 규칙은 섹션 바로 아래 block도 함께 고른다.
 *
 * 긴 수식 block은 줄일 수 없으므로 자기 안에서 가로로 스크롤한다.
 */
const BODY =
  'section-focus break-words break-keep [&>*:first-child]:mt-0 [&>section:first-child>:first-child]:mt-0 ' +
  '[&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden';

export function Markdown({ body, className = '' }: { body: string; className?: string }) {
  const article = useRef<HTMLDivElement>(null);
  useSectionFocus(article, body);

  return (
    <div ref={article} className={[BODY, className].filter(Boolean).join(' ')}>
      <ReactMarkdown components={MARKDOWN_COMPONENTS} remarkPlugins={MARKDOWN_PLUGINS} rehypePlugins={useRehypePlugins(body)}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
