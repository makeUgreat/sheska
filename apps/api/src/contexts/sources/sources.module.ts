import { Module, type DynamicModule } from '@nestjs/common';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { SourceContentSnapshotCalculator } from '@contexts/sources/application/services/source-content-snapshot-calculator.service';
import { SourceFromRepositoryLookup } from '@contexts/sources/application/services/source.from-repository.lookup';
import { type SourceRepository } from '@contexts/sources/domain';
import { GetSourceUseCase } from '@contexts/sources/application/use-cases/get-source.use-case';
import { ListSourcesUseCase } from '@contexts/sources/application/use-cases/list-sources.use-case';
import { UploadSourceUseCase } from '@contexts/sources/application/use-cases/upload-source.use-case';
import { SourceSha256Fingerprinter } from '@contexts/sources/infrastructure/fingerprinter/source.sha256.fingerprinter';
import * as sourcesSchema from '@contexts/sources/infrastructure/persistence/postgres-drizzle/schema';
import { SourcePgDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { SourceSyncJobPgDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source-sync-job.pg-drizzle.repository';
import { SourceEmbeddingFromIngestionLookup } from '@contexts/sources/acl/ingestion/source-embedding.from-ingestion.lookup';
import { SourcePgDrizzleQuery } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.query';
import { SourcesHttpController } from '@contexts/sources/presentation/http/sources-http.controller';
import { HandleIngestionResultHandler } from '@contexts/sources/application/event-handlers/handle-ingestion-result.handler';
import {
  type SourceEmbeddingLookup as IngestionSourceEmbeddingLookup,
  SOURCE_EMBEDDING_LOOKUP as INGESTION_SOURCE_EMBEDDING_LOOKUP,
  IngestionModule,
} from '@contexts/ingestion';
import {
  SOURCE_FINGERPRINTER,
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
  SOURCE_EMBEDDING_LOOKUP,
  SOURCE_QUERY,
  SOURCE_LOOKUP,
} from './sources.di-tokens';

export type SourcesModuleOptions = Record<string, never>;

@Module({})
export class SourcesModule {
  static forFeature(): DynamicModule {
    return {
      module: SourcesModule,
      imports: [IngestionModule.forFeature()],
      providers: [
        {
          provide: SOURCE_FINGERPRINTER,
          useClass: SourceSha256Fingerprinter,
        },
        {
          provide: SOURCE_REPOSITORY,
          useFactory: (db: NodePgDatabase<typeof sourcesSchema>) =>
            new SourcePgDrizzleRepository(db),
          inject: [DATABASE_TOKENS.drizzleDatabase],
        },
        {
          provide: SOURCE_SYNC_JOB_REPOSITORY,
          useFactory: (db: NodePgDatabase<typeof sourcesSchema>) =>
            new SourceSyncJobPgDrizzleRepository(db),
          inject: [DATABASE_TOKENS.drizzleDatabase],
        },
        {
          provide: SOURCE_EMBEDDING_LOOKUP,
          useFactory: (ingestionLookup: IngestionSourceEmbeddingLookup) =>
            new SourceEmbeddingFromIngestionLookup(ingestionLookup),
          inject: [INGESTION_SOURCE_EMBEDDING_LOOKUP],
        },
        {
          provide: SOURCE_QUERY,
          useFactory: (db: NodePgDatabase<typeof sourcesSchema>) =>
            new SourcePgDrizzleQuery(db),
          inject: [DATABASE_TOKENS.drizzleDatabase],
        },
        {
          provide: SOURCE_LOOKUP,
          useFactory: (repository: SourceRepository) =>
            new SourceFromRepositoryLookup(repository),
          inject: [SOURCE_REPOSITORY],
        },
        SourceContentSnapshotCalculator,
        ListSourcesUseCase,
        GetSourceUseCase,
        UploadSourceUseCase,
      ],
      exports: [
        SOURCE_REPOSITORY,
        SOURCE_SYNC_JOB_REPOSITORY,
        SOURCE_LOOKUP,
        ListSourcesUseCase,
        GetSourceUseCase,
        UploadSourceUseCase,
      ],
    };
  }

  static forRoot(_options: SourcesModuleOptions = {}): DynamicModule {
    return {
      module: SourcesModule,
      imports: [SourcesModule.forFeature()],
      controllers: [SourcesHttpController],
      providers: [HandleIngestionResultHandler],
    };
  }
}
