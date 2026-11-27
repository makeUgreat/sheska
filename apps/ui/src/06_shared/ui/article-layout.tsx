import { type ReactNode } from 'react';
import { LINE_IN, lineDelay } from './line-in';
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
  'relative isolate mt-16 pt-10 before:absolute before:top-0 before:-bottom-36 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 ' +
  'before:border-t before:border-plate-line before:bg-plate';

export function ArticleLayout({ header, body, footer }: { header: ReactNode; body: string; footer?: ReactNode }) {
  return (
    <article>
      <header className={`${PLATE} ${HEAD_WIDER} ${LINE_IN}`} style={lineDelay(0)}>
        {header}
      </header>

      {body && (
        <div className={`mt-11 ${LINE_IN}`} style={lineDelay(1)}>
          <Markdown body={body} />
        </div>
      )}

      {footer && <footer className={END_PLATE}>{footer}</footer>}
    </article>
  );
}
