import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { type KeyboardEvent } from 'react';
import { useThreadHeight } from './use-thread-height';

const STORAGE_KEY = 'sheska.ask.thread-height';

function press(key: string, shiftKey = false) {
  return { key, shiftKey, preventDefault: () => undefined } as unknown as KeyboardEvent<HTMLElement>;
}

describe('useThreadHeight', () => {
  afterEach(() => window.localStorage.clear());

  it('정한 높이가 없으면 null로 시작한다', () => {
    const { result } = renderHook(() => useThreadHeight(() => 200));

    expect(result.current.height).toBeNull();
  });

  it('위 화살표는 지금 높이에서 24px 늘리고 다음에 열 때 쓰도록 저장한다', () => {
    const { result } = renderHook(() => useThreadHeight(() => 200));

    act(() => result.current.gripProps.onKeyDown(press('ArrowUp')));

    expect(result.current.height).toBe(224);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('224');
  });

  it('최소 높이 아래로는 줄이지 않는다', () => {
    const { result } = renderHook(() => useThreadHeight(() => 170));

    act(() => result.current.gripProps.onKeyDown(press('ArrowDown', true)));

    expect(result.current.height).toBe(result.current.minHeight);
  });

  it('화면 높이의 70%를 넘게 늘리지 않는다', () => {
    const { result } = renderHook(() => useThreadHeight(() => 200));

    act(() => result.current.gripProps.onKeyDown(press('End')));

    expect(result.current.height).toBe(Math.round(window.innerHeight * 0.7));
  });

  it('Enter는 정한 높이를 지워 내용 높이를 따르게 한다', () => {
    window.localStorage.setItem(STORAGE_KEY, '240');
    const { result } = renderHook(() => useThreadHeight(() => 200));

    act(() => result.current.gripProps.onKeyDown(press('Enter')));

    expect(result.current.height).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('저장한 높이로 다시 시작한다', () => {
    window.localStorage.setItem(STORAGE_KEY, '240');

    const { result } = renderHook(() => useThreadHeight(() => 200));

    expect(result.current.height).toBe(240);
  });
});
