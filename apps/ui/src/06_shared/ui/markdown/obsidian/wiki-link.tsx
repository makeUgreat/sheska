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

export const LINK_STYLE =
  'font-medium text-accent-strong underline decoration-accent-strong/40 underline-offset-3 transition-[text-decoration-color] hover:decoration-accent-strong';

const MISSING_NOTE = 'font-medium text-text-muted underline decoration-outline-variant/30 decoration-dotted underline-offset-3';

export function WikiLink({ target, anchor, label }: WikiLinkProperties) {
  const blockId = target ? null : readBlockId(anchor);

  if (blockId) {
    return (
      <a href={`#${blockAnchorId(blockId)}`} className={LINK_STYLE}>
        {label}
      </a>
    );
  }

  return (
    <span title={`${label} — no note yet`} className={MISSING_NOTE}>
      {label}
    </span>
  );
}
