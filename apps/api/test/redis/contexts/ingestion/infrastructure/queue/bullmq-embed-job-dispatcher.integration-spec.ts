import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { type Queue } from 'bullmq';
import { AppModule } from '@platform/nest/app.module';
import {
  type EmbedJob,
  type EmbedJobDispatcher,
} from '@contexts/ingestion/application/ports';
import { EMBED_JOB_DISPATCHER } from '@contexts/ingestion/ingestion.di-tokens';
import { EMBED_JOBS_QUEUE } from '@contexts/ingestion/infrastructure/queue/bullmq/embed-job.bullmq.dispatcher';

describe('BullMqEmbedJobDispatcher', () => {
  let app: INestApplication;
  let dispatcher: EmbedJobDispatcher;
  let queue: Queue<EmbedJob>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dispatcher = app.get<EmbedJobDispatcher>(EMBED_JOB_DISPATCHER);
    queue = app.get<Queue<EmbedJob>>(getQueueToken(EMBED_JOBS_QUEUE));
  });

  afterEach(async () => {
    await queue.drain();
  });

  afterAll(async () => {
    await app.close();
  });

  it('embed job을 큐에 추가한다', async () => {
    const job = {
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      content: 'test content',
    };

    await dispatcher.dispatch(job);

    const waiting = await queue.getWaiting();
    expect(waiting).toHaveLength(1);
    expect(waiting[0].data).toEqual(job);
  });

  it('여러 job을 순서대로 큐에 추가한다', async () => {
    const jobs = [
      { sourceId: 'source-1', syncJobId: 'sync-job-1', content: 'content 1' },
      { sourceId: 'source-2', syncJobId: 'sync-job-2', content: 'content 2' },
    ];

    await dispatcher.dispatch(jobs[0]);
    await dispatcher.dispatch(jobs[1]);

    const waiting = await queue.getWaiting();
    expect(waiting).toHaveLength(2);
    expect(waiting.map((j) => j.data)).toEqual(jobs);
  });
});
