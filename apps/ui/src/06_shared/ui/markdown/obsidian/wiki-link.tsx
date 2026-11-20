import { blockAnchorId } from '../../../lib/markdown';

/** hProperties는 소문자 이름의 값만 컴포넌트 prop까지 그대로 전달되므로 camelCase를 쓰지 않는다. */
type WikiLinkProperties = {
  target?: string;
  anchor?: string;
  label?: string;
};

function readBlockId(anchor: string | undefined): string | null {
  return anchor?.startsWith('^') ? anchor.slice(1) : null;
}

/**
 * vault 원문의 `[[ ]]`를 남긴다. `inline-block`이어야 링크의 밑줄이 괄호까지 번지지 않는다.
 * Pseudo-element라 복사 결과에 섞이지 않고, 빈 대체 텍스트로 스크린 리더도 읽지 않는다.
 */
const WIKI_BRACKETS =
  "before:inline-block before:font-mono before:text-code-snippet before:text-text-muted before:content-['[['_/_''] " +
  "after:inline-block after:font-mono after:text-code-snippet after:text-text-muted after:content-[']]'_/_'']";

export function WikiLink({ target, anchor, label }: WikiLinkProperties) {
  const blockId = target ? null : readBlockId(anchor);

  if (blockId) {
    return (
      <a
        href={`#${blockAnchorId(blockId)}`}
        className={`text-accent-strong underline underline-offset-2 transition-colors hover:text-accent-hover ${WIKI_BRACKETS}`}
      >
        {label}
      </a>
    );
  }

  return (
    <span title={`${label} — no note yet`} className={`text-accent-strong underline decoration-dotted underline-offset-2 ${WIKI_BRACKETS}`}>
      {label}
    </span>
  );
}
