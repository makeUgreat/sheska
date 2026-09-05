import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { noticeMessages } from '../__mocks__/obsidian';
import type { SheskaApiClient } from '@/api/client';
import { HealthCheckScheduler } from '@/health-check';
import { DEFAULT_SETTINGS } from '@/settings';
import type { SheskaSettings } from '@/settings';

function makeScheduler(
  settings: Partial<SheskaSettings> = {},
  api = { health: vi.fn().mockResolvedValue({ status: 'ok' }) },
) {
  const registerInterval = vi.fn((id: number) => id);
  const scheduler = new HealthCheckScheduler(
    api as unknown as SheskaApiClient,
    { ...DEFAULT_SETTINGS, ...settings },
    registerInterval,
  );
  return { api, registerInterval, scheduler };
}

describe('HealthCheckScheduler', () => {
  beforeEach(() => {
    noticeMessages.length = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers an interval when the interval setting is positive', () => {
    const { registerInterval, scheduler } = makeScheduler({
      healthCheckIntervalMinutes: 1,
    });

    scheduler.start();

    expect(registerInterval).toHaveBeenCalledOnce();
  });

  it('does not register an interval when the interval setting is zero', () => {
    const { registerInterval, scheduler } = makeScheduler({
      healthCheckIntervalMinutes: 0,
    });

    scheduler.start();

    expect(registerInterval).not.toHaveBeenCalled();
  });

  it('runs health checks on the configured interval', async () => {
    const { api, scheduler } = makeScheduler({
      healthCheckIntervalMinutes: 1,
    });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(60 * 1000);

    expect(api.health).toHaveBeenCalledOnce();
  });

  it('shows a Notice when a health check fails', async () => {
    const { scheduler } = makeScheduler(
      { healthCheckIntervalMinutes: 1 },
      { health: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) },
    );

    scheduler.start();
    await vi.advanceTimersByTimeAsync(60 * 1000);

    expect(noticeMessages).toContain(
      'Sheska API health check failed. Check settings.',
    );
  });

  it('restarts with a replacement API client and settings', async () => {
    const oldApi = { health: vi.fn().mockResolvedValue({ status: 'old' }) };
    const newApi = { health: vi.fn().mockResolvedValue({ status: 'new' }) };
    const { scheduler } = makeScheduler(
      { healthCheckIntervalMinutes: 1 },
      oldApi,
    );
    scheduler.start();

    scheduler.configure(newApi as unknown as SheskaApiClient, {
      ...DEFAULT_SETTINGS,
      healthCheckIntervalMinutes: 2,
    });
    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(oldApi.health).not.toHaveBeenCalled();
    expect(newApi.health).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(newApi.health).toHaveBeenCalledOnce();
  });
});
