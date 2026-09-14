import { afterEach, describe, expect, it, vi } from 'vitest';
import { OutboxRelay } from '@kernels/infrastructure';
import { OutboxRelayRunner } from '../outbox-relay.runner';

describe('OutboxRelayRunner', () => {
  afterEach(() => vi.useRealTimers());

  it('application lifecycle 동안 주기적으로 relay를 실행한다', async () => {
    vi.useFakeTimers();
    const relayPending = vi.fn().mockResolvedValue(undefined);
    const logger = createLogger();
    const runner = new OutboxRelayRunner(
      {
        relayPending,
      } as unknown as OutboxRelay,
      { pollIntervalMs: 250 },
      logger,
    );

    runner.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(250);

    expect(relayPending).toHaveBeenCalledOnce();

    runner.onApplicationShutdown();
    await vi.advanceTimersByTimeAsync(250);

    expect(relayPending).toHaveBeenCalledOnce();
  });

  it('relay batch 오류를 기록하고 다음 polling을 계속한다', async () => {
    vi.useFakeTimers();
    const failure = new Error('Database unavailable');
    const relayPending = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(undefined);
    const logger = createLogger();
    const runner = new OutboxRelayRunner(
      {
        relayPending,
      } as unknown as OutboxRelay,
      { pollIntervalMs: 250 },
      logger,
    );

    runner.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(500);

    expect(relayPending).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      'Outbox relay polling failed',
      failure,
    );

    runner.onApplicationShutdown();
  });
});

function createLogger() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}
