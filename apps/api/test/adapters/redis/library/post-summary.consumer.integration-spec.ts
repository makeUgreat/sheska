import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { type Queue, QueueEvents } from 'bullmq';
import { LOGGER } from '@kernels/application';
import { POST_SUMMARY_QUEUE } from '@contexts/library/application/ports';
import { GeneratePostSummaryUseCase } from '@contexts/library/application/use-cases/generate-post-summary.use-case';
import { PostSummaryBullMqConsumer } from '@contexts/library/presentation/queue/bullmq/post-summary.bullmq.consumer';
import { REDIS_TEST_URL } from '../support/redis.connection';

const REDIS_CONNECTION = { url: REDIS_TEST_URL };

describe('PostSummaryBullMqConsumer', () => {
  let app: INestApplication;
  let queue: Queue;
  let queueEvents: QueueEvents;
  const execute = vi.fn();
  const handleFailure = vi.fn();

  beforeEach(async () => {
    execute.mockReset();
    handleFailure.mockReset();

    const moduleFixture = await Test.createTestingModule({
      imports: [BullModule.forRoot({ connection: REDIS_CONNECTION }), BullModule.registerQueue({ name: POST_SUMMARY_QUEUE })],
      providers: [
        PostSummaryBullMqConsumer,
        { provide: GeneratePostSummaryUseCase, useValue: { execute, handleFailure } },
        { provide: LOGGER, useValue: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    queue = app.get(getQueueToken(POST_SUMMARY_QUEUE));
    queueEvents = new QueueEvents(POST_SUMMARY_QUEUE, { connection: REDIS_CONNECTION });
    await queueEvents.waitUntilReady();
  });

  afterEach(async () => {
    await queueEvents.close();
    await queue.obliterate({ force: true });
    await app.close();
  });

  it('queue에 들어온 job의 post로 요약을 만든다', async () => {
    execute.mockResolvedValue({ outcome: 'completed' });

    const job = await queue.add('generate-post-summary', { postId: 'post-1' }, { jobId: 'post-1-fingerprint-1' });
    await job.waitUntilFinished(queueEvents);

    expect(execute).toHaveBeenCalledWith({ postId: 'post-1' }, expect.objectContaining({ maxRetries: 0 }));
    expect(handleFailure).not.toHaveBeenCalled();
  });

  it('마지막 시도까지 실패하면 실패한 요약을 저장한다', async () => {
    execute.mockRejectedValue(new Error('overloaded'));
    handleFailure.mockResolvedValue(undefined);

    const job = await queue.add('generate-post-summary', { postId: 'post-1' }, { jobId: 'post-1-fingerprint-1', attempts: 2 });
    await expect(job.waitUntilFinished(queueEvents)).rejects.toThrow('overloaded');

    await vi.waitFor(() => expect(handleFailure).toHaveBeenCalledWith({ postId: 'post-1' }));
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
