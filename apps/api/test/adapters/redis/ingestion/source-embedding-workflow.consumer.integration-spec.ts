import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { type Queue, QueueEvents } from 'bullmq';
import { LOGGER } from '@kernels/application';
import { IntegrationEventsModule } from '@platform/nest/events/integration-events.module';
import {
  SOURCE_EMBEDDING_CHUNK_QUEUE,
  SOURCE_EMBEDDING_FINALIZATION_QUEUE,
  SOURCE_EMBEDDING_FLOW_PRODUCER,
  type EmbeddingWorkflowDispatcher,
  type IngestionUnitOfWork,
} from '@contexts/ingestion/application/ports';
import {
  EMBEDDER,
  EMBEDDING_WORKFLOW_DISPATCHER,
  INGESTION_UNIT_OF_WORK,
} from '@contexts/ingestion/ingestion.di-tokens';
import { EmbedSourceChunkUseCase } from '@contexts/ingestion/application/use-cases/embed-source-chunk.use-case';
import { FinalizeEmbeddingWorkflowUseCase } from '@contexts/ingestion/application/use-cases/finalize-embedding-workflow.use-case';
import { SourceEmbeddingWorkflowBullMqDispatcher } from '@contexts/ingestion/infrastructure/queue/bullmq/source-embedding-workflow.bullmq.dispatcher';
import { SourceEmbeddingChunkBullMqConsumer } from '@contexts/ingestion/presentation/queue/bullmq/source-embedding-chunk.bullmq.consumer';
import { SourceEmbeddingFinalizationBullMqConsumer } from '@contexts/ingestion/presentation/queue/bullmq/source-embedding-finalization.bullmq.consumer';
import { VALID_EMBEDDING } from '../../../support/domains/fixtures/source-embedding.fixture';

const REDIS_CONNECTION = { host: '127.0.0.1', port: 56379 };

describe('Embedding workflow consumers', () => {
  let app: INestApplication;
  let chunkQueue: Queue;
  let finalizeQueue: Queue;
  let finalizeQueueEvents: QueueEvents;
  let workflowDispatcher: EmbeddingWorkflowDispatcher;
  const embed =
    vi.fn<(text: string) => Promise<{ embedding: number[]; model: string }>>();
  const save = vi.fn();
  const append = vi.fn();

  beforeEach(async () => {
    embed.mockReset();
    save.mockReset();
    append.mockReset();

    const moduleFixture = await Test.createTestingModule({
      imports: [
        BullModule.forRoot({ connection: REDIS_CONNECTION }),
        BullModule.registerQueue({ name: SOURCE_EMBEDDING_CHUNK_QUEUE }),
        BullModule.registerQueue({
          name: SOURCE_EMBEDDING_FINALIZATION_QUEUE,
        }),
        BullModule.registerFlowProducer({
          name: SOURCE_EMBEDDING_FLOW_PRODUCER,
        }),
        EventEmitterModule.forRoot(),
        IntegrationEventsModule,
      ],
      providers: [
        SourceEmbeddingChunkBullMqConsumer,
        SourceEmbeddingFinalizationBullMqConsumer,
        EmbedSourceChunkUseCase,
        FinalizeEmbeddingWorkflowUseCase,
        {
          provide: EMBEDDING_WORKFLOW_DISPATCHER,
          useClass: SourceEmbeddingWorkflowBullMqDispatcher,
        },
        { provide: EMBEDDER, useValue: { embed } },
        {
          provide: INGESTION_UNIT_OF_WORK,
          useValue: {
            execute: (work) =>
              work({
                sourceEmbeddings: { save, find: vi.fn() },
                outbox: { append },
              }),
          } satisfies IngestionUnitOfWork,
        },
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

    const eventEmitter = app.get(EventEmitter2);
    eventEmitter.on('source.ingestion.completed', () => undefined);
    eventEmitter.on('source.ingestion.failed', () => undefined);

    chunkQueue = app.get(getQueueToken(SOURCE_EMBEDDING_CHUNK_QUEUE));
    finalizeQueue = app.get(getQueueToken(SOURCE_EMBEDDING_FINALIZATION_QUEUE));
    workflowDispatcher = app.get(EMBEDDING_WORKFLOW_DISPATCHER);
    finalizeQueueEvents = new QueueEvents(SOURCE_EMBEDDING_FINALIZATION_QUEUE, {
      connection: REDIS_CONNECTION,
    });
    await finalizeQueueEvents.waitUntilReady();
  });

  afterEach(async () => {
    await finalizeQueueEvents.close();
    await chunkQueue.obliterate({ force: true });
    await finalizeQueue.obliterate({ force: true });
    await app.close();
  });

  it('각 chunk를 처리한 뒤 parent가 결과 전체를 한 번 저장한다', async () => {
    embed.mockResolvedValue({
      embedding: VALID_EMBEDDING,
      model: 'qwen3-embedding:0.6b',
    });
    save.mockResolvedValue(undefined);

    await workflowDispatcher.dispatch({
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      chunks: [
        { chunkIndex: 0, chunkContent: 'first' },
        { chunkIndex: 1, chunkContent: 'second' },
      ],
    });

    const parent = await finalizeQueue.getJob('sync-job-1');
    await parent!.waitUntilFinished(finalizeQueueEvents);

    expect(embed).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledOnce();
    expect(append).toHaveBeenCalledOnce();
    await expect(chunkQueue.getJob('sync-job-1-0')).resolves.toMatchObject({
      progress: 100,
    });
  });

  it('실패한 chunk만 다시 시도하고 성공한 chunk는 다시 embed하지 않는다', async () => {
    embed
      .mockRejectedValueOnce(new Error('embedder unavailable'))
      .mockResolvedValue({
        embedding: VALID_EMBEDDING,
        model: 'qwen3-embedding:0.6b',
      });
    save.mockResolvedValue(undefined);

    await workflowDispatcher.dispatch({
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      chunks: [
        { chunkIndex: 0, chunkContent: 'first' },
        { chunkIndex: 1, chunkContent: 'second' },
      ],
    });

    const parent = await finalizeQueue.getJob('sync-job-1');
    await parent!.waitUntilFinished(finalizeQueueEvents);

    // 첫 시도 1회 실패 + 재시도 1회 + 나머지 chunk 1회 = 3회.
    expect(embed).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenCalledOnce();
    const retried = await chunkQueue.getJob('sync-job-1-0');
    expect(retried?.attemptsMade).toBe(2);
  });

  it('chunk가 시도를 모두 소진해야 parent가 실패한다', async () => {
    embed.mockRejectedValue(new Error('embedder unavailable'));

    await workflowDispatcher.dispatch({
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      chunks: [{ chunkIndex: 0, chunkContent: 'first' }],
    });

    const parent = await finalizeQueue.getJob('sync-job-1');
    await expect(
      parent!.waitUntilFinished(finalizeQueueEvents),
    ).rejects.toThrow();

    expect(embed).toHaveBeenCalledTimes(3);
    const child = await chunkQueue.getJob('sync-job-1-0');
    expect(child?.attemptsMade).toBe(3);
    expect(save).not.toHaveBeenCalled();
  });

  it('같은 sync job으로 workflow를 다시 등록해도 job을 중복 생성하지 않는다', async () => {
    await chunkQueue.pause();
    await finalizeQueue.pause();
    const payload = {
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      chunks: [
        { chunkIndex: 0, chunkContent: 'first' },
        { chunkIndex: 1, chunkContent: 'second' },
      ],
    };

    await workflowDispatcher.dispatch(payload);
    await workflowDispatcher.dispatch(payload);

    expect(await chunkQueue.getJobCounts()).toMatchObject({ paused: 2 });
    expect(await finalizeQueue.getJobCounts()).toMatchObject({
      'waiting-children': 1,
    });
  });
});
