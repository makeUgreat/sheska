import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpClientProvider, type HttpClientType as HttpClient } from '@/shared/api';
import { useRecordPostView } from './use-record-post-view';

const MINUTE = 60 * 1000;

function buildHttp(post = vi.fn().mockResolvedValue(undefined)) {
  return { http: { post } as unknown as HttpClient, post };
}

function renderRecord(http: HttpClient, postId: string | undefined) {
  const wrapper = ({ children }: { children: ReactNode }) => <HttpClientProvider client={http}>{children}</HttpClientProvider>;

  return renderHook(({ id }: { id: string | undefined }) => useRecordPostView(id), { wrapper, initialProps: { id: postId } });
}

describe('useRecordPostView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-21T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('처음 보는 post면 기록 API를 한 번 부른다', () => {
    const { http, post } = buildHttp();

    renderRecord(http, 'post-1');

    expect(post).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith('/posts/post-1/views', {});
  });

  it('30분 안에 같은 post를 다시 열면 부르지 않는다', () => {
    const { http, post } = buildHttp();

    renderRecord(http, 'post-1').unmount();
    vi.setSystemTime(new Date('2026-11-21T10:29:59.999Z'));
    renderRecord(http, 'post-1');

    expect(post).toHaveBeenCalledOnce();
  });

  it('30분이 지나면 다시 부른다', () => {
    const { http, post } = buildHttp();

    renderRecord(http, 'post-1').unmount();
    vi.advanceTimersByTime(30 * MINUTE);
    renderRecord(http, 'post-1');

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('다른 post는 따로 판단한다', () => {
    const { http, post } = buildHttp();

    const view = renderRecord(http, 'post-1');
    view.rerender({ id: 'post-2' });

    expect(post).toHaveBeenNthCalledWith(1, '/posts/post-1/views', {});
    expect(post).toHaveBeenNthCalledWith(2, '/posts/post-2/views', {});
  });

  it('post를 아직 받지 않았으면 부르지 않는다', () => {
    const { http, post } = buildHttp();

    renderRecord(http, undefined);

    expect(post).not.toHaveBeenCalled();
  });

  it('저장소를 쓸 수 없어도 같은 탭에서는 한 번만 부른다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { http, post } = buildHttp();

    renderRecord(http, 'post-without-storage').unmount();
    renderRecord(http, 'post-without-storage');

    expect(post).toHaveBeenCalledOnce();
  });

  it('기록에 실패해도 오류를 밖으로 던지지 않는다', async () => {
    const { http, post } = buildHttp(vi.fn().mockRejectedValue(new Error('network')));

    renderRecord(http, 'post-1');
    await vi.runAllTimersAsync();

    expect(post).toHaveBeenCalledOnce();
  });
});
