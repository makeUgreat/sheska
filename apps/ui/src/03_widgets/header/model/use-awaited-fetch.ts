import { useEffect, useState } from 'react';
import { type Query, useIsFetching } from '@tanstack/react-query';

/** 이 안에 끝난 요청은 즉시로 느껴진다. 잠깐 나타났다 사라지는 표시가 오히려 느리게 보인다. */
const SHOW_AFTER_MS = 200;
/** 220ms에 나타나 240ms에 사라지면 깜빡임이 된다. */
const MIN_SHOWN_MS = 400;
const SLOW_AFTER_SECONDS = 3;

/** 화면이 아직 그리지 못한 데이터만 기다림으로 본다. 이미 보이는 데이터를 새로 고치는 요청은 기다림이 아니다. */
function isAwaited(query: Query) {
  return query.state.data === undefined || query.state.fetchMeta?.fetchMore !== undefined;
}

export function useAwaitedFetch() {
  const fetching = useIsFetching({ predicate: isAwaited }) > 0;
  const [shownAt, setShownAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!fetching) return;

    const startedAt = Date.now();
    const show = setTimeout(() => setShownAt((at) => at ?? Date.now()), SHOW_AFTER_MS);
    const clock = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => {
      clearTimeout(show);
      clearInterval(clock);
    };
  }, [fetching]);

  useEffect(() => {
    if (fetching || shownAt === null) return;

    const hide = setTimeout(
      () => {
        setShownAt(null);
        setSeconds(0);
      },
      shownAt + MIN_SHOWN_MS - Date.now(),
    );
    return () => clearTimeout(hide);
  }, [fetching, shownAt]);

  return {
    waiting: shownAt !== null,
    slowSeconds: shownAt !== null && seconds >= SLOW_AFTER_SECONDS ? seconds : null,
  };
}
