import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createMarkdownComponents } from './markdown-components';

const DEFAULT_COMPONENTS = createMarkdownComponents();

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
    <div className={['break-words', className].filter(Boolean).join(' ')}>
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
