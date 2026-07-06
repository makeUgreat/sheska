import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { type Queue, QueueEvents } from 'bullmq';
import {
  EmbedRequestConsumer,
  EMBED_REQUESTS_QUEUE,
  type EmbedRequestPayload,
} from '@contexts/ingestion/application/queue-handlers/embed-request.consumer';
import {
  EMBED_RESULTS_QUEUE,
  type EmbedResultPayload,
} from '@contexts/ingestion/application/queue-handlers/embed-result.consumer';
import { EMBEDDER } from '@contexts/ingestion/ingestion.di-tokens';
import { IngestionFailedDomainEvent } from '@contexts/ingestion/domain';

const REDIS_CONNECTION = { host: '127.0.0.1', port: 56379 };

describe('EmbedRequestConsumer', () => {
  let app: INestApplication;
  let embedRequestsQueue: Queue<EmbedRequestPayload>;
  let embedResultsQueue: Queue<EmbedResultPayload>;
  let queueEvents: QueueEvents;
  const embed = vi.fn();

  beforeEach(async () => {
    embed.mockReset();

    const moduleFixture = await Test.createTestingModule({
      imports: [
        BullModule.forRoot({ connection: REDIS_CONNECTION }),
        BullModule.registerQueue({ name: EMBED_REQUESTS_QUEUE }),
        BullModule.registerQueue({ name: EMBED_RESULTS_QUEUE }),
        EventEmitterModule.forRoot(),
      ],
      providers: [
        EmbedRequestConsumer,
        { provide: EMBEDDER, useValue: { embed } },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    embedRequestsQueue = app.get(getQueueToken(EMBED_REQUESTS_QUEUE));
    embedResultsQueue = app.get(getQueueToken(EMBED_RESULTS_QUEUE));
    queueEvents = new QueueEvents(EMBED_REQUESTS_QUEUE, {
      connection: REDIS_CONNECTION,
    });
    await queueEvents.waitUntilReady();
  });

  afterEach(async () => {
    await queueEvents.close();
    await embedRequestsQueue.obliterate({ force: true });
    await embedResultsQueue.obliterate({ force: true });
    await app.close();
  });

  it('content를 임베딩하고 결과 job을 embed-results 큐에 추가한다', async () => {
    embed.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      model: 'nomic-embed-text',
    });

    const job = await embedRequestsQueue.add('embed-request', {
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      content: '# Hello World',
    });

    await job.waitUntilFinished(queueEvents);

    expect(embed).toHaveBeenCalledWith('# Hello World');

    const [resultJob] = await embedResultsQueue.getWaiting();
    expect(resultJob.data).toMatchObject({
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      embedding: [0.1, 0.2, 0.3],
      model: 'nomic-embed-text',
    });
  });

  it('embed()가 실패하면 IngestionFailedDomainEvent를 emit한다', async () => {
    embed.mockRejectedValue(new Error('Ollama unavailable'));
    const eventEmitter = app.get(EventEmitter2);

    const failedEventPromise = new Promise<IngestionFailedDomainEvent>(
      (resolve) => {
        eventEmitter.once('source.ingestion.failed', resolve);
      },
    );

    await embedRequestsQueue.add(
      'embed-request',
      { sourceId: 'source-1', syncJobId: 'sync-job-1', content: 'text' },
      { attempts: 1 },
    );

    const event = await failedEventPromise;
    expect(event).toBeInstanceOf(IngestionFailedDomainEvent);
    expect(event.syncJobId).toBe('sync-job-1');
  });
});
