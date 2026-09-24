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

export function WikiLink({ target, anchor, label }: WikiLinkProperties) {
  const blockId = target ? null : readBlockId(anchor);

  if (blockId) {
    return (
      <a
        href={`#${blockAnchorId(blockId)}`}
        className="text-accent-strong underline underline-offset-2 transition-colors hover:text-accent-hover"
      >
        {label}
      </a>
    );
  }

  return (
    <span
      title={`${label} — no note yet`}
      className="text-accent-strong underline decoration-dotted underline-offset-2"
    >
      {label}
    </span>
  );
}
