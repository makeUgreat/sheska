import { useEffect } from 'react';
import { recordPostView } from '@/entities/post';
import { useHttpClient } from '@/shared/api';

/** 서버의 조회수 cooldown과 같다. 서버가 다시 판단하므로 이 값은 호출을 줄이는 데만 쓴다. */
const COOLDOWN_MS = 30 * 60 * 1000;

const STORAGE_KEY = 'sheska.post-views.recorded-at';

type RecordedAt = Record<string, number>;

/** 저장소를 쓸 수 없으면 이번 탭에서만 기억한다. */
let fallback: RecordedAt = {};

/**
 * 상세 화면에 들어올 때 조회를 기록한다. 이 브라우저가 30분 안에 같은 post를 기록했으면 부르지 않는다.
 * 기록에 실패해도 화면에는 알리지 않는다. 조회 하나가 빠지는 것은 허용한다.
 */
export function useRecordPostView(postId: string | undefined) {
  const http = useHttpClient();

  useEffect(() => {
    if (!postId) return;
    if (!claim(postId, Date.now())) return;

    recordPostView(http, postId).catch(() => undefined);
  }, [http, postId]);
}

/** 기록할 차례면 시각을 먼저 남긴다. StrictMode의 두 번째 effect와 다른 탭이 같은 기록을 다시 보내지 않는다. */
function claim(postId: string, now: number): boolean {
  const recorded = readFresh(now);
  if (Object.hasOwn(recorded, postId)) return false;

  save({ ...recorded, [postId]: now });
  return true;
}

function readFresh(now: number): RecordedAt {
  const fresh: RecordedAt = {};
  for (const [postId, at] of Object.entries(read())) {
    if (now - at < COOLDOWN_MS) fresh[postId] = at;
  }

  return fresh;
}

function read(): RecordedAt {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    return isRecordedAt(parsed) ? parsed : {};
  } catch {
    return fallback;
  }
}

function save(recorded: RecordedAt) {
  fallback = recorded;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recorded));
  } catch {
    return;
  }
}

function isRecordedAt(value: unknown): value is RecordedAt {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  return Object.values(value).every((at) => typeof at === 'number');
}
