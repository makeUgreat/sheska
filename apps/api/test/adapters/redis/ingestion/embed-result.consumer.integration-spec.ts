import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { type Queue, QueueEvents } from 'bullmq';
import { EmbedResultBullMqConsumer } from '@contexts/ingestion/presentation/queue/bullmq/embed-result.bullmq.consumer';
import { SaveEmbeddingResultUseCase } from '@contexts/ingestion/application/use-cases/save-embedding-result.use-case';
import { LOGGER } from '@kernels/application';
import { SOURCE_EMBEDDING_REPOSITORY } from '@contexts/ingestion/ingestion.di-tokens';
import {
  IngestionCompletedDomainEvent,
  IngestionFailedDomainEvent,
} from '@contexts/ingestion/domain';
import {
  EMBED_RESULTS_QUEUE,
  type EmbedResultPayload,
} from '@contexts/ingestion/application/ports';
import { VALID_EMBEDDING } from '../../../support/domains/fixtures/source-embedding.fixture';

const REDIS_CONNECTION = { host: '127.0.0.1', port: 56379 };

const defaultChunks: EmbedResultPayload['chunks'] = [
  { chunkIndex: 0, chunkContent: 'chunk content', embedding: VALID_EMBEDDING },
];

describe('EmbedResultBullMqConsumer', () => {
  let app: INestApplication;
  let embedResultsQueue: Queue<EmbedResultPayload>;
  let queueEvents: QueueEvents;
  const save = vi.fn();

  beforeEach(async () => {
    save.mockReset();

    const moduleFixture = await Test.createTestingModule({
      imports: [
        BullModule.forRoot({ connection: REDIS_CONNECTION }),
        BullModule.registerQueue({ name: EMBED_RESULTS_QUEUE }),
        EventEmitterModule.forRoot(),
      ],
      providers: [
        EmbedResultBullMqConsumer,
        SaveEmbeddingResultUseCase,
        { provide: SOURCE_EMBEDDING_REPOSITORY, useValue: { save } },
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

    embedResultsQueue = app.get(getQueueToken(EMBED_RESULTS_QUEUE));
    queueEvents = new QueueEvents(EMBED_RESULTS_QUEUE, {
      connection: REDIS_CONNECTION,
    });
    await queueEvents.waitUntilReady();
  });

  afterEach(async () => {
    await queueEvents.close();
    await embedResultsQueue.obliterate({ force: true });
    await app.close();
  });

  it('embedding 결과를 저장하고 ingestion-completed 이벤트를 emit한다', async () => {
    save.mockResolvedValue(undefined);
    const eventEmitter = app.get(EventEmitter2);
    const emit = vi.spyOn(eventEmitter, 'emit');

    const job = await embedResultsQueue.add('embed-result', {
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      model: 'qwen3-embedding:0.6b',
      chunks: defaultChunks,
    });

    await job.waitUntilFinished(queueEvents);

    expect(save).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith(
      'source.ingestion.completed',
      expect.any(IngestionCompletedDomainEvent),
    );
  });

  it('save()가 실패하면 IngestionFailedDomainEvent를 emit한다', async () => {
    save.mockRejectedValue(new Error('DB error'));
    const eventEmitter = app.get(EventEmitter2);

    const failedEventPromise = new Promise<IngestionFailedDomainEvent>(
      (resolve) => {
        eventEmitter.once('source.ingestion.failed', resolve);
      },
    );

    await embedResultsQueue.add(
      'embed-result',
      {
        sourceId: 'source-1',
        syncJobId: 'sync-job-1',
        model: 'qwen3-embedding:0.6b',
        chunks: defaultChunks,
      },
      { attempts: 1 },
    );

    const event = await failedEventPromise;
    expect(event).toBeInstanceOf(IngestionFailedDomainEvent);
    expect(event.syncJobId).toBe('sync-job-1');
  });
});
