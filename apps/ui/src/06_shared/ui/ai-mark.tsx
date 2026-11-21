const STAR = 'origin-center [transform-box:fill-box] motion-reduce:animate-none';

/**
 * 감싼 행(`group/entry`)에 올린 동안 두 별이 번갈아 반짝인다.
 * `twinkling`이면 행과 상관없이 계속 반짝인다. AI가 답이나 요약을 만드는 동안처럼 실제로 일이 진행될 때만 켠다.
 */
export function AiMark({ className = '', twinkling = false }: { className?: string; twinkling?: boolean }) {
  const big = twinkling ? 'animate-twinkle-big' : 'group-hover/entry:animate-twinkle-big';
  const small = twinkling ? 'animate-twinkle-small' : 'group-hover/entry:animate-twinkle-small';

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={['size-4 shrink-0 fill-current', className].filter(Boolean).join(' ')}>
      <path
        className={`${STAR} ${big}`}
        d="M10 4.5C10 10.125 13.375 13.5 19 13.5C13.375 13.5 10 16.875 10 22.5C10 16.875 6.625 13.5 1 13.5C6.625 13.5 10 10.125 10 4.5Z"
      />
      <path className={`${STAR} ${small}`} d="M19 1C19 3.5 20.5 5 23 5C20.5 5 19 6.5 19 9C19 6.5 17.5 5 15 5C17.5 5 19 3.5 19 1Z" />
    </svg>
  );
}
