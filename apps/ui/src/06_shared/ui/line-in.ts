export const LINE_IN = 'animate-terminal-line-in motion-reduce:animate-none';

const LINE_STAGGER_MS = 24;
/** 긴 목록도 400ms 안에 다 보이게 이 줄부터는 더 늦추지 않는다. */
const LAST_STAGGERED_LINE = 10;

export function lineDelay(index: number) {
  return { animationDelay: `${Math.min(index, LAST_STAGGERED_LINE) * LINE_STAGGER_MS}ms` };
}
