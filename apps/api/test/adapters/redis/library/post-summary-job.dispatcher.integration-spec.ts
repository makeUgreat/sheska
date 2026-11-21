import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { type Queue } from 'bullmq';
import { POST_SUMMARY_QUEUE } from '@contexts/library/application/ports';
import { PostSummaryJobBullMqDispatcher } from '@contexts/library/infrastructure/queue/bullmq/post-summary-job.bullmq.dispatcher';
import { REDIS_TEST_URL } from '../support/redis.connection';

describe('PostSummaryJobBullMqDispatcher', () => {
  let app: INestApplication;
  let queue: Queue;
  let dispatcher: PostSummaryJobBullMqDispatcher;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [BullModule.forRoot({ connection: { url: REDIS_TEST_URL } }), BullModule.registerQueue({ name: POST_SUMMARY_QUEUE })],
      providers: [PostSummaryJobBullMqDispatcher],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    queue = app.get(getQueueToken(POST_SUMMARY_QUEUE));
    dispatcher = app.get(PostSummaryJobBullMqDispatcher);
  });

  afterEach(async () => {
    await queue.obliterate({ force: true });
    await app.close();
  });

  it('post와 본문 fingerprint로 만든 ID의 job을 재시도 설정과 함께 넣는다', async () => {
    await dispatcher.dispatch({ postId: 'post-1', fingerprint: 'fingerprint-1' });

    const job = await queue.getJob('post-1-fingerprint-1');
    expect(job?.data).toEqual({ postId: 'post-1' });
    expect(job?.opts).toMatchObject({ attempts: 5, backoff: { type: 'exponential', delay: 120_000 } });
  });

  it('같은 본문으로 다시 넣으면 job을 하나만 남긴다', async () => {
    await dispatcher.dispatch({ postId: 'post-1', fingerprint: 'fingerprint-1' });
    await dispatcher.dispatch({ postId: 'post-1', fingerprint: 'fingerprint-1' });

    await expect(queue.getJobCountByTypes('waiting')).resolves.toBe(1);
  });

  it('본문이 바뀌면 새 job을 넣는다', async () => {
    await dispatcher.dispatch({ postId: 'post-1', fingerprint: 'fingerprint-1' });
    await dispatcher.dispatch({ postId: 'post-1', fingerprint: 'fingerprint-2' });

    await expect(queue.getJobCountByTypes('waiting')).resolves.toBe(2);
  });
});
