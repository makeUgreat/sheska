import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { type Queue, QueueEvents } from 'bullmq';
import {
  EmbedResultConsumer,
  EMBED_RESULTS_QUEUE,
  type EmbedResultPayload,
} from '@contexts/ingestion/application/queue-handlers/embed-result.consumer';
import { SOURCE_VECTOR_REPOSITORY } from '@contexts/ingestion/ingestion.di-tokens';
import {
  IngestionCompletedDomainEvent,
  IngestionFailedDomainEvent,
} from '@contexts/ingestion/domain';
import { VALID_EMBEDDING } from '../../domains/fixtures/source-vector.fixture';

const REDIS_CONNECTION = { host: '127.0.0.1', port: 56379 };

describe('EmbedResultConsumer', () => {
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
        EmbedResultConsumer,
        { provide: SOURCE_VECTOR_REPOSITORY, useValue: { save } },
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
      embedding: VALID_EMBEDDING,
      model: 'qwen3-embedding:0.6b',
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
        embedding: VALID_EMBEDDING,
        model: 'qwen3-embedding:0.6b',
      },
      { attempts: 1 },
    );

    const event = await failedEventPromise;
    expect(event).toBeInstanceOf(IngestionFailedDomainEvent);
    expect(event.syncJobId).toBe('sync-job-1');
  });
});
