import { type Element } from 'hast';
import { type ComponentProps, type ReactNode } from 'react';
import { type Components } from 'react-markdown';
import { CodeBlock, isMathBlock, useInsideCodeBlock } from './code-block';
import { MarkdownImage } from './markdown-image';
import { CALLOUT_ELEMENT, CALLOUT_TITLE_ELEMENT, WIKI_LINK_ELEMENT } from '../../lib/markdown';
import { Callout, CalloutTitle } from './obsidian/callout';
import { WikiLink } from './obsidian/wiki-link';

/** Anchor로 이동하면 목적지가 sticky header 뒤에 가려진다. */
const BELOW_HEADER = 'scroll-mt-[calc(var(--spacing-header)+var(--spacing-gutter))]';

/**
 * Loose list도 tight list 간격으로 그린다.
 * 항목 안의 코드 블록과 표는 본문용 간격을 쓰면 어느 항목에 속하는지 흐려진다.
 */
const LIST_BASE =
  'mb-5 space-y-1.5 text-body-prose text-text-secondary ' +
  '[&_li>p]:mb-0 [&_ul]:mt-1.5 [&_ul]:mb-0 [&_ol]:mt-1.5 [&_ol]:mb-0 ' +
  '[&_li>div]:mt-2 [&_li>div]:mb-4';

function anchored(id: string | undefined, className: string) {
  return id ? `${className} ${BELOW_HEADER}`.trim() : className;
}

/** KaTeX의 `.katex-display`와 같은 여백이라야 수식이 도착할 때 아래 글이 덜 움직인다. */
const DISPLAY_MATH_SOURCE = 'my-[1em] block text-center';

/**
 * KaTeX가 도착하기 전의 수식은 code 모양 없이 원문 글자로 둔다.
 * Fence 안의 code는 highlighter가 붙인 class를 그대로 들고 가야 token ink가 걸린다.
 */
function CodeText({ className, children }: { className?: string; children?: ReactNode }) {
  const insideCodeBlock = useInsideCodeBlock();
  if (className?.includes('math-display')) return <span className={DISPLAY_MATH_SOURCE}>{children}</span>;
  if (className?.includes('math-inline')) return <span>{children}</span>;

  return insideCodeBlock ? (
    <code className={className}>{children}</code>
  ) : (
    <code className="mx-0.5 font-mono text-[0.875em] text-accent-strong">{children}</code>
  );
}

/** 수식 block에 code fence의 언어 라벨과 복사 버튼을 붙이면 KaTeX가 도착할 때 사라진다. */
function Pre({ node, children }: { node?: Element; children?: ReactNode }) {
  return isMathBlock(node) ? <>{children}</> : <CodeBlock node={node}>{children}</CodeBlock>;
}

/** 넓은 화면에서는 얕은 단계일수록 본문 왼쪽 끝보다 더 왼쪽에서 시작해 깊이가 위치로도 보인다. */
const HEADING_STYLE = {
  h2: 'mt-12 mb-4 font-sans text-headline-sm text-text-primary [--outdent:--spacing(4)]',
  h3: 'mt-10 mb-3 font-sans text-title-lg text-text-primary [--outdent:--spacing(3)]',
  h4: 'mt-8 mb-2 font-sans text-title-md text-text-primary [--outdent:--spacing(2)]',
  h5: 'mt-6 mb-2 font-sans text-title-sm text-text-primary [--outdent:--spacing(1)]',
  h6: 'mt-4 mb-2 font-mono text-label-sm uppercase text-text-primary [--outdent:0px]',
} as const;

const OUTDENTED = 'margin-label:-ml-(--outdent)';

type HeadingTag = keyof typeof HEADING_STYLE;

/**
 * 넓은 화면에서는 기호를 왼쪽 여백에 걸어 heading 글자가 본문 왼쪽 끝에 맞게 한다.
 * Pseudo-element라 복사 결과에 섞이지 않고, `/ ''` 대체 텍스트로 스크린 리더도 읽지 않는다.
 * `######`는 여백 폭보다 넓다. `justify-end`라야 넘친 부분이 heading 쪽이 아니라 바깥으로 나간다.
 */
const SOURCE_MARK =
  'before:mr-2 before:font-mono before:font-normal before:tracking-normal before:text-[0.8em] ' +
  'margin-label:before:ml-[calc(var(--outdent)-var(--spacing-margin-label)-var(--mark-gap))] margin-label:before:mr-[calc(var(--mark-gap)-var(--outdent))] ' +
  'margin-label:before:inline-flex margin-label:before:w-(--spacing-margin-label) margin-label:before:justify-end margin-label:before:opacity-0 ' +
  '[--mark-gap:--spacing(8)]';

const SECTION_MARK = `${SOURCE_MARK} before:text-accent`;

const SUBSECTION_MARK = `${SOURCE_MARK} before:text-text-muted`;

/** 기호는 낮춘 뒤의 tag가 아니라 원문 단계를 따른다. `#####`와 `######`는 같은 h6로 그려진다. */
const HEADING_MARK = {
  h1: `${SECTION_MARK} before:content-['#'_/_'']`,
  h2: `${SUBSECTION_MARK} before:content-['##'_/_'']`,
  h3: `${SUBSECTION_MARK} before:content-['###'_/_'']`,
  h4: `${SUBSECTION_MARK} before:content-['####'_/_'']`,
  h5: `${SUBSECTION_MARK} before:content-['#####'_/_'']`,
  h6: `${SUBSECTION_MARK} before:content-['######'_/_'']`,
} as const;

type SourceHeading = keyof typeof HEADING_MARK;

/** 본문은 page 제목 `<h1>` 아래에 놓이므로 모든 heading을 한 단계씩 낮춘다. */
const BELOW_TITLE = { h1: 'h2', h2: 'h3', h3: 'h4', h4: 'h5', h5: 'h6', h6: 'h6' } as const satisfies Record<SourceHeading, HeadingTag>;

const HeadingBelowTitle = (source: SourceHeading): Components['h1'] => {
  const Tag = BELOW_TITLE[source];

  return function Heading({ children, id }) {
    return (
      <Tag id={id} className={`${HEADING_STYLE[Tag]} ${OUTDENTED} ${HEADING_MARK[source]} ${BELOW_HEADER}`}>
        {children}
      </Tag>
    );
  };
};

/** `::marker`의 글꼴은 Safari가 무시한다. 그래도 기호 문자 자체는 같으므로 그대로 둔다. */
const LIST_MARK = 'marker:font-mono marker:text-code-snippet marker:text-text-muted';

const ROOT_NODE =
  '[:not(li)>&>li]:relative [:not(li)>&>li]:before:absolute [:not(li)>&>li]:before:top-[11px] [:not(li)>&>li]:before:-left-3.5 ' +
  "[:not(li)>&>li]:before:size-1.5 [:not(li)>&>li]:before:rounded-full [:not(li)>&>li]:before:bg-outline-variant/55 [:not(li)>&>li]:before:content-['']";

/**
 * 중첩 목록은 `-` 대신 tree 연결선으로 부모와 이어 그린다. 마지막 항목에서 세로선이 끝나 목록의 끝이 보인다.
 * 선의 높이는 본문 첫 줄 가운데(28px 줄의 14px)와 항목 사이 간격(6px)에 맞춘 값이다.
 */
const TREE_BRANCH =
  '[li>&]:list-none [li>&]:pl-5.5 [li>&>li]:relative ' +
  "[li>&>li]:before:absolute [li>&>li]:before:-top-1.5 [li>&>li]:before:-left-4 [li>&>li]:before:h-5 [li>&>li]:before:w-2.5 [li>&>li]:before:border-b [li>&>li]:before:border-l [li>&>li]:before:border-outline-variant/30 [li>&>li]:before:content-[''] " +
  '[li>&>li:first-child]:before:top-0 [li>&>li:first-child]:before:h-3.5 ' +
  "[li>&>li:not(:last-child)]:after:absolute [li>&>li:not(:last-child)]:after:top-3.5 [li>&>li:not(:last-child)]:after:bottom-0 [li>&>li:not(:last-child)]:after:-left-4 [li>&>li:not(:last-child)]:after:border-l [li>&>li:not(:last-child)]:after:border-outline-variant/30 [li>&>li:not(:last-child)]:after:content-['']";

/** Checkbox는 상태를 읽기 도구에 전하려고 남기고, 눈에는 원문 표기만 보인다. */
const TASK_MARK = 'shrink-0 font-mono text-code-snippet';

const DONE_MARK = `${TASK_MARK} text-accent-strong before:content-['[x]'_/_'']`;

const TODO_MARK = `${TASK_MARK} text-text-muted before:content-['[_]'_/_'']`;

/**
 * 인용 안의 문단마다 `>`를 붙인다. 문단이 여럿이면 첫 문단에만 붙여서는 인용의 끝이 보이지 않는다.
 * 인용은 여백에 걸지 않고 들여 쓴다. 안에 든 목록과 code fence는 기호가 없어 들여쓰기로만 인용에 속함이 보인다.
 */
const QUOTE_MARK =
  '[&>p]:before:inline-flex [&>p]:before:-ml-5 [&>p]:before:w-5 [&>p]:before:font-mono [&>p]:before:text-code-snippet ' +
  "[&>p]:before:text-text-muted [&>p]:before:content-['>'_/_'']";

const components: Components = {
  h1: HeadingBelowTitle('h1'),
  h2: HeadingBelowTitle('h2'),
  h3: HeadingBelowTitle('h3'),
  h4: HeadingBelowTitle('h4'),
  h5: HeadingBelowTitle('h5'),
  h6: HeadingBelowTitle('h6'),
  p: ({ id, children }) => (
    <p id={id} className={anchored(id, 'mb-5 text-body-prose text-text-secondary')}>
      {children}
    </p>
  ),
  li: ({ className, children, id }) =>
    className?.includes('task-list-item') ? (
      <li id={id} className={anchored(id, 'flex items-baseline gap-2')}>
        {children}
      </li>
    ) : (
      <li id={id} className={id ? BELOW_HEADER : undefined}>
        {children}
      </li>
    ),
  input: ({ checked }) => (
    <>
      <input type="checkbox" checked={checked} disabled className="sr-only" />
      <span aria-hidden="true" className={checked ? DONE_MARK : TODO_MARK} />
    </>
  ),
  del: ({ children }) => <del className="text-text-muted line-through">{children}</del>,
  table: ({ id, children }) => (
    <div id={id} className={anchored(id, 'my-7 overflow-x-auto')}>
      <table className="w-full border-collapse text-left text-body-md text-text-secondary">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-outline-variant/20 px-3 py-2 first:pl-0 last:pr-0 font-mono text-label-sm font-normal uppercase text-text-muted">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-b border-outline-variant/10 px-3 py-2 first:pl-0 last:pr-0 align-top">{children}</td>,
  ul: ({ className, children, id }) =>
    className?.includes('contains-task-list') ? (
      <ul id={id} className={anchored(id, `${LIST_BASE} list-none pl-0`)}>
        {children}
      </ul>
    ) : (
      <ul id={id} className={anchored(id, `${LIST_BASE} list-none pl-4 ${ROOT_NODE} ${TREE_BRANCH}`)}>
        {children}
      </ul>
    ),
  /** Mono 숫자와 마침표는 `pl-4`보다 넓어서 두 자리 번호가 화면 밖으로 나간다. */
  ol: ({ id, children }) => (
    <ol id={id} className={anchored(id, `${LIST_BASE} ${LIST_MARK} list-decimal pl-6`)}>
      {children}
    </ol>
  ),
  blockquote: ({ id, children }) => (
    <blockquote id={id} className={anchored(id, `my-7 pl-5 text-body-prose text-text-secondary ${QUOTE_MARK}`)}>
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-12 h-auto border-0 text-center font-mono text-code-snippet text-text-muted before:content-['---'_/_'']" />,
  a: ({ children, href }) => (
    <a href={href} className="text-accent-strong underline underline-offset-2 transition-colors hover:text-accent-hover">
      {children}
    </a>
  ),
  img: MarkdownImage,
  pre: Pre,
  code: CodeText,
};

/**
 * Heading id를 여기서 따로 만들지 않는다. `parseOutline`이 읽는 id와 어긋나지 않으려면
 * `remarkHeadingId`가 트리에 새긴 값을 그대로 받아야 한다.
 */
export const MARKDOWN_COMPONENTS = {
  ...components,
  [WIKI_LINK_ELEMENT]: WikiLink,
  [CALLOUT_ELEMENT]: ({ id, type, fold, children }: ComponentProps<typeof Callout>) => (
    <Callout id={id} type={type} fold={fold} className={anchored(id, '')}>
      {children}
    </Callout>
  ),
  [CALLOUT_TITLE_ELEMENT]: CalloutTitle,
} as Components;
