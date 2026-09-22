import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createMarkdownComponents } from './markdown-components';

const DEFAULT_COMPONENTS = createMarkdownComponents();

/**
 * 본문을 감싼 box에 padding이 있으면 첫 block의 위 margin이 상쇄되지 못하고
 * padding 위에 그대로 얹힌다. 첫 block만 붙이고 나머지 간격은 그대로 둔다.
 */
const BODY = 'break-words [&>*:first-child]:mt-0';

/** 모든 본문 Markdown은 이 컴포넌트를 거쳐 같은 typography를 쓴다. */
export function Markdown({
  body,
  components = DEFAULT_COMPONENTS,
  className = '',
}: {
  body: string;
  components?: Components;
  className?: string;
}) {
  return (
    <div className={[BODY, className].filter(Boolean).join(' ')}>
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
