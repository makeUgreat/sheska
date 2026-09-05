import { Module, type DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { IngestSourceHandler } from '@contexts/ingestion/application/event-handlers/ingest-source.handler';
import type { Embedder } from '@contexts/ingestion/application/ports';
import {
  EmbedRequestConsumer,
  EMBED_REQUESTS_QUEUE,
} from '@contexts/ingestion/application/queue-handlers/embed-request.consumer';
import {
  EmbedResultConsumer,
  EMBED_RESULTS_QUEUE,
} from '@contexts/ingestion/application/queue-handlers/embed-result.consumer';
import { OllamaHttpEmbedder } from '@contexts/ingestion/infrastructure/embedding/ollama-http/ollama-http.embedder';
import { parseOllamaConfig } from '@contexts/ingestion/infrastructure/embedding/ollama-http/ollama-http.config';
import {
  RecursiveCharacterChunker,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_SEPARATORS,
} from '@contexts/ingestion/application/services/recursive-character.chunker';
import { SourceEmbeddingPgDrizzleRepository } from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/source-embedding.pg-drizzle.repository';
import * as ingestionSchema from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/schema';
import { EMBEDDER, SOURCE_EMBEDDING_REPOSITORY } from './ingestion.di-tokens';

export type IngestionModuleOptions = Record<string, never>;

@Module({})
export class IngestionModule {
  static forFeature(): DynamicModule {
    return {
      module: IngestionModule,
      providers: [
        {
          provide: SOURCE_EMBEDDING_REPOSITORY,
          useFactory: (db: NodePgDatabase<typeof ingestionSchema>) =>
            new SourceEmbeddingPgDrizzleRepository(db),
          inject: [DATABASE_TOKENS.drizzleDatabase],
        },
        {
          provide: EMBEDDER,
          useFactory: (configService: ConfigService): Embedder => {
            const config = parseOllamaConfig({
              EMBEDDING_BASE_URL: configService.get('EMBEDDING_BASE_URL'),
            });
            return new OllamaHttpEmbedder({
              baseUrl: config.baseUrl,
              model: 'qwen3-embedding:0.6b',
            });
          },
          inject: [ConfigService],
        },
      ],
      exports: [SOURCE_EMBEDDING_REPOSITORY, EMBEDDER],
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
        {
          provide: RecursiveCharacterChunker,
          useFactory: () =>
            new RecursiveCharacterChunker({
              chunkSize: DEFAULT_CHUNK_SIZE,
              chunkOverlap: DEFAULT_CHUNK_OVERLAP,
              separators: DEFAULT_SEPARATORS,
            }),
        },
        IngestSourceHandler,
        EmbedRequestConsumer,
        EmbedResultConsumer,
      ],
    };
  }
}
