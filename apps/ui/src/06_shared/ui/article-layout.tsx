import { type ReactNode, useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion } from '../lib/prefers-reduced-motion';
import { Markdown } from './markdown';

/**
 * 머리판은 읽는 칸 밖으로 화면 폭 전체에 깐다. 판의 아래 경계가 AI가 쓴 머리와 vault 원문을 나눈다.
 * `100vw`는 scrollbar 자리까지 넓으므로 감싸는 쪽이 가로로 넘친 부분을 잘라야 한다.
 */
const PLATE =
  'relative isolate pt-10 pb-8 before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 ' +
  'before:border-b before:border-plate-line before:bg-plate';

const HEAD_WIDER = 'margin-label:-mx-6';

const END_PLATE =
  'relative isolate mt-16 pt-10 before:absolute before:top-0 before:-bottom-24 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 ' +
  'before:border-t before:border-plate-line before:bg-plate';

const STEPPED_BLOCKS = ':scope > header > *, :scope > div > * > :not(section), :scope > div section > :not(section)';
const STEP_IN: Keyframe[] = [{ offset: 0, opacity: 0, transform: 'translateY(8px)' }];
const STEP_IN_MS = 320;
const STEP_GAP_MS = 45;
const LAST_STEPPED_BLOCK = 12;

function useStepIn() {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const article = ref.current;
    if (!article || prefersReducedMotion()) return;

    const blocks = [...article.querySelectorAll(STEPPED_BLOCKS)].filter((block) => block.getBoundingClientRect().top < window.innerHeight);
    const animations = blocks.map((block, order) =>
      block.animate(STEP_IN, {
        duration: STEP_IN_MS,
        delay: Math.min(order, LAST_STEPPED_BLOCK) * STEP_GAP_MS,
        easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
        fill: 'backwards',
      }),
    );

    return () => animations.forEach((animation) => animation.cancel());
  }, []);

  return ref;
}

export function ArticleLayout({ header, body, footer }: { header: ReactNode; body: string; footer?: ReactNode }) {
  const ref = useStepIn();

  return (
    <article ref={ref}>
      <header className={`${PLATE} ${HEAD_WIDER}`}>{header}</header>

      {body && (
        <div className="mt-11">
          <Markdown body={body} />
        </div>
      )}

      {footer && <footer className={END_PLATE}>{footer}</footer>}
    </article>
  );
}
