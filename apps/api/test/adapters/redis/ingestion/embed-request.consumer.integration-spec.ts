import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { type Queue, QueueEvents } from 'bullmq';
import { EmbedRequestBullMqConsumer } from '@contexts/ingestion/presentation/queue/bullmq/embed-request.bullmq.consumer';
import { EmbedResultBullMqDispatcher } from '@contexts/ingestion/infrastructure/queue/bullmq/embed-result.bullmq.dispatcher';
import { EmbedSourceContentUseCase } from '@contexts/ingestion/application/use-cases/embed-source-content.use-case';
import { LOGGER } from '@kernels/application';
import {
  EMBEDDER,
  EMBED_RESULT_DISPATCHER,
} from '@contexts/ingestion/ingestion.di-tokens';
import {
  EMBED_REQUESTS_QUEUE,
  EMBED_RESULTS_QUEUE,
  type EmbedRequestPayload,
  type EmbedResultPayload,
} from '@contexts/ingestion/application/ports';
import { IngestionFailedDomainEvent } from '@contexts/ingestion/domain';
import {
  RecursiveCharacterChunker,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_SEPARATORS,
} from '@contexts/ingestion/application/services/recursive-character.chunker';

const REDIS_CONNECTION = { host: '127.0.0.1', port: 56379 };

describe('EmbedRequestBullMqConsumer', () => {
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
        EmbedRequestBullMqConsumer,
        EmbedSourceContentUseCase,
        {
          provide: EMBED_RESULT_DISPATCHER,
          useClass: EmbedResultBullMqDispatcher,
        },
        {
          provide: RecursiveCharacterChunker,
          useFactory: () =>
            new RecursiveCharacterChunker({
              chunkSize: DEFAULT_CHUNK_SIZE,
              chunkOverlap: DEFAULT_CHUNK_OVERLAP,
              separators: DEFAULT_SEPARATORS,
            }),
        },
        { provide: EMBEDDER, useValue: { embed } },
        {
          provide: LOGGER,
          useValue: {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
          },
        },
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
      model: 'qwen3-embedding:0.6b',
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
      model: 'qwen3-embedding:0.6b',
      chunks: [
        {
          chunkIndex: 0,
          chunkContent: '# Hello World',
          embedding: [0.1, 0.2, 0.3],
        },
      ],
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
