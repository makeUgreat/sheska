import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sleep } from '../sleep';

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ms가 지나기 전에는 resolve하지 않는다', async () => {
    const resolved = vi.fn();
    void sleep(1_000).then(resolved);

    await vi.advanceTimersByTimeAsync(999);

    expect(resolved).not.toHaveBeenCalled();
  });

  it('ms가 지나면 resolve한다', async () => {
    const resolved = vi.fn();
    void sleep(1_000).then(resolved);

    await vi.advanceTimersByTimeAsync(1_000);

    expect(resolved).toHaveBeenCalledOnce();
  });
});
