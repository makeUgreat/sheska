import { type Ref } from 'react';
import { type PostView } from '@/entities/post';
import { formatDottedMonthDay, formatTime } from '@/shared/lib';
import { EmptyState, EndOfList, ErrorState } from '@/shared/ui';

export type PostViewsState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'empty' }
  | { status: 'success'; views: PostView[]; hasNextPage: boolean; sentinelRef: Ref<HTMLDivElement> };

const HEAD = 'border-b border-text-primary pb-2.5 pr-3 text-left font-semibold uppercase tracking-[0.1em] text-text-primary';
const CELL = 'border-b border-outline-variant/12 py-3 pr-3 align-top';

/** 기다리는 동안에는 아무것도 그리지 않는다. 기다리는 표시는 header 프롬프트가 맡는다. */
export function PostViewsSection({ state }: { state: PostViewsState }) {
  switch (state.status) {
    case 'loading':
      return null;
    case 'error':
      return <ErrorState error={state.error} />;
    case 'empty':
      return <EmptyState variant="list" className="py-24" />;
    case 'success':
      return <PostViewsTable views={state.views} hasNextPage={state.hasNextPage} sentinelRef={state.sentinelRef} />;
  }
}

/** 좁은 화면에서는 표 상자 안에서만 가로로 밀린다. 방문 수단은 한 줄로 자르고 원문은 hover로 보인다. */
function PostViewsTable({
  views,
  hasNextPage,
  sentinelRef,
}: {
  views: PostView[];
  hasNextPage: boolean;
  sentinelRef: Ref<HTMLDivElement>;
}) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] table-fixed border-collapse font-mono text-label-sm tracking-normal">
          <colgroup>
            <col className="w-[150px]" />
            <col className="w-[140px]" />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={HEAD}>
                Time
              </th>
              <th scope="col" className={HEAD}>
                IP
              </th>
              <th scope="col" className={HEAD}>
                Client
              </th>
            </tr>
          </thead>
          <tbody>
            {views.map((view, index) => (
              <PostViewRow key={`${view.viewedAt}-${view.ip}-${index}`} view={view} startsDay={startsDay(views, index)} />
            ))}
          </tbody>
        </table>
      </div>
      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      {!hasNextPage && <EndOfList label="End of history" className="mt-12" />}
    </>
  );
}

function PostViewRow({ view, startsDay }: { view: PostView; startsDay: boolean }) {
  const cell = startsDay ? `${CELL} border-t border-t-plate-line` : CELL;
  const unknown = view.client === 'unknown';

  return (
    <tr data-starts-day={startsDay || undefined}>
      <td className={`${cell} whitespace-nowrap tabular-nums text-text-secondary`}>
        <time dateTime={view.viewedAt}>
          <span className="text-text-muted">{formatDottedMonthDay(view.viewedAt)}</span> {formatTime(view.viewedAt)}
        </time>
      </td>
      <td className={`${cell} whitespace-nowrap tabular-nums text-text-primary`}>{view.ip}</td>
      <td className={`${cell} truncate text-text-muted ${unknown ? 'italic' : ''}`} title={unknown ? undefined : view.client}>
        {view.client}
      </td>
    </tr>
  );
}

/** 첫 행이 아니고 바로 위 행과 날짜가 다르면 그날의 첫 행이다. */
function startsDay(views: PostView[], index: number): boolean {
  const previous = views[index - 1];
  if (!previous) return false;

  return formatDottedMonthDay(previous.viewedAt) !== formatDottedMonthDay(views[index].viewedAt);
}
