import { type ReactNode } from 'react';

/**
 * 미리보기는 목록에 이미 있는 항목을 넓은 화면에서 한 번 더 보여줄 뿐이라 보조기술에서는 숨긴다.
 * 좁은 화면에서는 자리가 없으므로 목록만 남긴다.
 */
export function PeekLayout({
  children,
  peek,
}: {
  children: ReactNode;
  peek: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-measure gap-12 lg:max-w-none lg:grid-cols-[minmax(0,var(--spacing-measure))_var(--spacing-peek)] lg:justify-center">
      <div className="min-w-0">{children}</div>
      <aside
        aria-hidden="true"
        className="sticky top-[calc(var(--spacing-header)+--spacing(12))] hidden self-start border-l border-outline-variant/25 pl-6 lg:block"
      >
        {peek}
      </aside>
    </div>
  );
}
