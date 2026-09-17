import { Module, type DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  SOURCE_EMBEDDING_CHUNK_QUEUE,
  SOURCE_EMBEDDING_FINALIZATION_QUEUE,
  SOURCE_EMBEDDING_FLOW_PRODUCER,
} from '@contexts/ingestion/application/ports';
import { EmbedSourceChunkUseCase } from '@contexts/ingestion/application/use-cases/embed-source-chunk.use-case';
import { InitiateSourceEmbeddingUseCase } from '@contexts/ingestion/application/use-cases/initiate-source-embedding.use-case';
import { FinalizeEmbeddingWorkflowUseCase } from '@contexts/ingestion/application/use-cases/finalize-embedding-workflow.use-case';
import { SourceEmbeddingChunkBullMqConsumer } from '@contexts/ingestion/presentation/queue/bullmq/source-embedding-chunk.bullmq.consumer';
import { SourceEmbeddingFinalizationBullMqConsumer } from '@contexts/ingestion/presentation/queue/bullmq/source-embedding-finalization.bullmq.consumer';
import { SourceSyncJobCreatedIntegrationEventConsumer } from '@contexts/ingestion/presentation/events/source-sync-job-created.integration-event.consumer';
import { SourceEmbeddingWorkflowBullMqDispatcher } from '@contexts/ingestion/infrastructure/queue/bullmq/source-embedding-workflow.bullmq.dispatcher';
import { OllamaHttpEmbedder } from '@contexts/ingestion/infrastructure/embedding/ollama-http/ollama-http.embedder';
import {
  OLLAMA_CONFIG,
  parseOllamaConfig,
} from '@contexts/ingestion/infrastructure/embedding/ollama-http/ollama-http.config';
import {
  RecursiveCharacterChunker,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_SEPARATORS,
} from '@contexts/ingestion/application/services/recursive-character.chunker';
import { SourceEmbeddingFromRepositoryLookup } from '@contexts/ingestion/application/services/source-embedding.from-repository.lookup';
import { SourceEmbeddingPgDrizzleRepository } from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/source-embedding.pg-drizzle.repository';
import { IngestionPgDrizzleUnitOfWork } from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/ingestion.pg-drizzle.unit-of-work';
import {
  EMBEDDER,
  SOURCE_EMBEDDING_REPOSITORY,
  SOURCE_EMBEDDING_LOOKUP,
  EMBEDDING_WORKFLOW_DISPATCHER,
  INGESTION_UNIT_OF_WORK,
} from './ingestion.di-tokens';

export type IngestionModuleOptions = Record<string, never>;

@Module({})
export class IngestionModule {
  static forFeature(): DynamicModule {
    return {
      module: IngestionModule,
      imports: [
        BullModule.registerQueue({
          name: SOURCE_EMBEDDING_FINALIZATION_QUEUE,
        }),
      ],
      providers: [
        {
          provide: SOURCE_EMBEDDING_REPOSITORY,
          useClass: SourceEmbeddingPgDrizzleRepository,
        },
        {
          provide: INGESTION_UNIT_OF_WORK,
          useClass: IngestionPgDrizzleUnitOfWork,
        },
        {
          provide: SOURCE_EMBEDDING_LOOKUP,
          useClass: SourceEmbeddingFromRepositoryLookup,
        },
        {
          provide: OLLAMA_CONFIG,
          useFactory: (configService: ConfigService) =>
            parseOllamaConfig({
              EMBEDDING_BASE_URL: configService.get('EMBEDDING_BASE_URL'),
            }),
          inject: [ConfigService],
        },
        {
          provide: EMBEDDER,
          useClass: OllamaHttpEmbedder,
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
      ],
      exports: [
        SOURCE_EMBEDDING_REPOSITORY,
        INGESTION_UNIT_OF_WORK,
        SOURCE_EMBEDDING_LOOKUP,
        EMBEDDER,
        RecursiveCharacterChunker,
      ],
    };
  }

  static forRoot(_options: IngestionModuleOptions = {}): DynamicModule {
    return {
      module: IngestionModule,
      imports: [
        BullModule.registerQueue({ name: SOURCE_EMBEDDING_CHUNK_QUEUE }),
        BullModule.registerFlowProducer({
          name: SOURCE_EMBEDDING_FLOW_PRODUCER,
        }),
        IngestionModule.forFeature(),
      ],
      providers: [
        SourceSyncJobCreatedIntegrationEventConsumer,
        {
          provide: EMBEDDING_WORKFLOW_DISPATCHER,
          useClass: SourceEmbeddingWorkflowBullMqDispatcher,
        },
        InitiateSourceEmbeddingUseCase,
        EmbedSourceChunkUseCase,
        FinalizeEmbeddingWorkflowUseCase,
        SourceEmbeddingChunkBullMqConsumer,
        SourceEmbeddingFinalizationBullMqConsumer,
      ],
    };
  }
}
