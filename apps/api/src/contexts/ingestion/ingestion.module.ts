import { Module, type DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { IngestSourceHandler } from '@contexts/ingestion/application/event-handlers/ingest-source.handler';
import {
  EMBED_REQUESTS_QUEUE,
  EMBED_RESULTS_QUEUE,
} from '@contexts/ingestion/application/ports';
import { EmbedSourceContentUseCase } from '@contexts/ingestion/application/use-cases/embed-source-content.use-case';
import { SaveEmbeddingResultUseCase } from '@contexts/ingestion/application/use-cases/save-embedding-result.use-case';
import { EmbedRequestBullMqConsumer } from '@contexts/ingestion/presentation/queue/bullmq/embed-request.bullmq.consumer';
import { EmbedResultBullMqConsumer } from '@contexts/ingestion/presentation/queue/bullmq/embed-result.bullmq.consumer';
import { EmbedRequestBullMqDispatcher } from '@contexts/ingestion/infrastructure/queue/bullmq/embed-request.bullmq.dispatcher';
import { EmbedResultBullMqDispatcher } from '@contexts/ingestion/infrastructure/queue/bullmq/embed-result.bullmq.dispatcher';
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
import {
  EMBEDDER,
  SOURCE_EMBEDDING_REPOSITORY,
  SOURCE_EMBEDDING_LOOKUP,
  EMBED_REQUEST_DISPATCHER,
  EMBED_RESULT_DISPATCHER,
} from './ingestion.di-tokens';

export type IngestionModuleOptions = Record<string, never>;

@Module({})
export class IngestionModule {
  static forFeature(): DynamicModule {
    return {
      module: IngestionModule,
      providers: [
        {
          provide: SOURCE_EMBEDDING_REPOSITORY,
          useClass: SourceEmbeddingPgDrizzleRepository,
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
        BullModule.registerQueue({ name: EMBED_REQUESTS_QUEUE }),
        BullModule.registerQueue({ name: EMBED_RESULTS_QUEUE }),
        IngestionModule.forFeature(),
      ],
      providers: [
        IngestSourceHandler,
        {
          provide: EMBED_REQUEST_DISPATCHER,
          useClass: EmbedRequestBullMqDispatcher,
        },
        {
          provide: EMBED_RESULT_DISPATCHER,
          useClass: EmbedResultBullMqDispatcher,
        },
        EmbedSourceContentUseCase,
        SaveEmbeddingResultUseCase,
        EmbedRequestBullMqConsumer,
        EmbedResultBullMqConsumer,
      ],
    };
  }
}
