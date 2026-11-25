import { describe, expect, it, vi } from 'vitest';
import { type Job } from 'bullmq';
import { type GeneratePostSummaryUseCase } from '@contexts/library/application/use-cases/post-summary/generate-post-summary.use-case';
import { type GeneratePostSummaryJobInput } from '../dto/generate-post-summary.job-input.dto';
import { PostSummaryBullMqConsumer } from '../post-summary.bullmq.consumer';

describe('PostSummaryBullMqConsumer', () => {
  it('job의 post로 요약 생성을 부르고 큐 재시도에 맡기도록 adapter 재시도를 끈다', async () => {
    const { consumer, execute } = setup();

    await consumer.process(buildJob());

    expect(execute).toHaveBeenCalledWith({ postId: 'post-1' }, { deadline: expect.any(Object) as object, maxRetries: 0 });
  });

  it('job 입력이 계약과 다르면 거부한다', async () => {
    const { consumer, execute } = setup();

    await expect(consumer.process(buildJob({ data: { postId: '' } }))).rejects.toThrow();

    expect(execute).not.toHaveBeenCalled();
  });

  it('시도가 남아 있으면 실패한 요약을 저장하지 않고 로그도 남기지 않는다', async () => {
    const { consumer, handleFailure, logger } = setup();

    await consumer.onFailed(buildJob({ attemptsMade: 2, maxAttempts: 5 }), new Error('overloaded'));

    expect(handleFailure).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  // nocap: library-summary-6
  it('마지막 시도가 실패하면 error 로그를 한 번 남기고 실패한 요약을 저장한다', async () => {
    const { consumer, handleFailure, logger } = setup();

    await consumer.onFailed(buildJob({ attemptsMade: 5, maxAttempts: 5 }), new Error('overloaded'));

    expect(handleFailure).toHaveBeenCalledWith({ postId: 'post-1' });
    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('실패한 요약 저장이 실패하면 error 로그를 남기고 던지지 않는다', async () => {
    const { consumer, handleFailure, logger } = setup();
    handleFailure.mockRejectedValue(new Error('database unavailable'));

    await consumer.onFailed(buildJob({ attemptsMade: 5, maxAttempts: 5 }), new Error('overloaded'));

    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  it('worker 에러는 error 로그로 남긴다', () => {
    const { consumer, logger } = setup();

    consumer.onError(new Error('redis connection lost'));

    expect(logger.error).toHaveBeenCalledWith('post-summary worker error', expect.any(Error), { queueName: 'post-summary' });
  });

  it('마지막 시도의 job 입력이 계약과 다르면 error 로그 한 번만 남기고 저장을 건너뛴다', async () => {
    const { consumer, handleFailure, logger } = setup();

    await consumer.onFailed(buildJob({ attemptsMade: 5, maxAttempts: 5, data: { postId: '' } }), new Error('invalid'));

    expect(handleFailure).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledOnce();
  });
});

function setup() {
  const execute = vi.fn().mockResolvedValue({ outcome: 'completed' });
  const handleFailure = vi.fn().mockResolvedValue(undefined);
  const logger = { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  const consumer = new PostSummaryBullMqConsumer({ execute, handleFailure } as unknown as GeneratePostSummaryUseCase, logger);

  return { consumer, execute, handleFailure, logger };
}

function buildJob(
  options: { attemptsMade?: number; maxAttempts?: number; data?: GeneratePostSummaryJobInput } = {},
): Job<GeneratePostSummaryJobInput> {
  return {
    id: 'post-1-fingerprint-1',
    queueName: 'post-summary',
    attemptsMade: options.attemptsMade ?? 0,
    opts: { attempts: options.maxAttempts ?? 5 },
    data: options.data ?? { postId: 'post-1' },
  } as unknown as Job<GeneratePostSummaryJobInput>;
}
