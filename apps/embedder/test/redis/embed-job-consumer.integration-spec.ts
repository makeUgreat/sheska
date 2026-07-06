import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { type Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  EMBED_JOBS_QUEUE,
  EMBED_RESULTS_QUEUE,
  EmbedJobConsumer,
} from '../../src/embedding/embed-job.consumer';
import { EMBEDDING_CLIENT } from '../../src/embedding/embedding.port';

const REDIS_URL = new URL(process.env.REDIS_URL ?? 'redis://127.0.0.1:56380');
const connection = {
  host: REDIS_URL.hostname,
  port: parseInt(REDIS_URL.port),
};

const FAKE_EMBEDDING = [0.1, 0.2, 0.3];
const FAKE_MODEL = 'test-model';

describe('EmbedJobConsumer (integration)', () => {
  let app: Awaited<ReturnType<typeof bootstrap>>;
  let jobsQueue: Queue;
  let resultsQueue: Queue;

  beforeAll(async () => {
    app = await bootstrap();
    jobsQueue = app.moduleRef.get<Queue>(getQueueToken(EMBED_JOBS_QUEUE));
    resultsQueue = app.moduleRef.get<Queue>(getQueueToken(EMBED_RESULTS_QUEUE));
  });

  afterAll(async () => {
    await jobsQueue.obliterate({ force: true });
    await resultsQueue.obliterate({ force: true });
    await app.nestApp.close();
  });

  it('publishes embed-result to the results queue after processing a job', async () => {
    await jobsQueue.add('embed', {
      sourceId: 'src-1',
      syncJobId: 'sync-1',
      content: 'hello world',
    });

    const result = await pollForJob(resultsQueue);

    expect(result).toMatchObject({
      sourceId: 'src-1',
      syncJobId: 'sync-1',
      embedding: FAKE_EMBEDDING,
      model: FAKE_MODEL,
    });
  });
});

async function bootstrap() {
  const moduleRef = await Test.createTestingModule({
    imports: [
      BullModule.forRoot({ connection }),
      BullModule.registerQueue(
        { name: EMBED_JOBS_QUEUE },
        { name: EMBED_RESULTS_QUEUE },
      ),
    ],
    providers: [
      EmbedJobConsumer,
      {
        provide: EMBEDDING_CLIENT,
        useValue: {
          embed: (_text: string) =>
            Promise.resolve({
              embedding: FAKE_EMBEDDING,
              model: FAKE_MODEL,
            }),
        },
      },
    ],
  }).compile();

  const nestApp = moduleRef.createNestApplication();
  await nestApp.init();

  return { moduleRef, nestApp };
}

async function pollForJob(
  queue: Queue,
  timeoutMs = 5_000,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const [job] = await queue.getJobs(['waiting', 'active', 'delayed']);
    if (job) return job.data as Record<string, unknown>;
    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error(`Timed out waiting for a job in queue "${queue.name}"`);
}
