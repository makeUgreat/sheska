import { Module, type DynamicModule } from '@nestjs/common';
import { SourceContentSnapshotCalculator } from '@contexts/sources/application/services/source-content-snapshot-calculator.service';
import { SourceFromRepositoryLookup } from '@contexts/sources/application/services/source.from-repository.lookup';
import { GetSourceUseCase } from '@contexts/sources/application/use-cases/get-source.use-case';
import { GetSourceSyncJobUseCase } from '@contexts/sources/application/use-cases/get-source-sync-job.use-case';
import { ListSourcesUseCase } from '@contexts/sources/application/use-cases/list-sources.use-case';
import { UploadSourceUseCase } from '@contexts/sources/application/use-cases/upload-source.use-case';
import { SourceSha256Fingerprinter } from '@contexts/sources/infrastructure/fingerprinter/source.sha256.fingerprinter';
import { SourcePgDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { SourceSyncJobPgDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source-sync-job.pg-drizzle.repository';
import { SourceEmbeddingFromIngestionLookup } from '@contexts/sources/acl/ingestion/source-embedding.from-ingestion.lookup';
import { SourcePgDrizzleQuery } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.query';
import { SourcesPgDrizzleUnitOfWork } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/sources.pg-drizzle.unit-of-work';
import { SourcesHttpController } from '@contexts/sources/presentation/http/sources-http.controller';
import { SourceSyncJobsHttpController } from '@contexts/sources/presentation/http/source-sync-jobs-http.controller';
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
  SOURCES_UNIT_OF_WORK,
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
          useClass: SourcePgDrizzleRepository,
        },
        {
          provide: SOURCE_SYNC_JOB_REPOSITORY,
          useClass: SourceSyncJobPgDrizzleRepository,
        },
        {
          provide: SOURCES_UNIT_OF_WORK,
          useClass: SourcesPgDrizzleUnitOfWork,
        },
        {
          provide: SOURCE_EMBEDDING_LOOKUP,
          useFactory: (ingestionLookup: IngestionSourceEmbeddingLookup) =>
            new SourceEmbeddingFromIngestionLookup(ingestionLookup),
          inject: [INGESTION_SOURCE_EMBEDDING_LOOKUP],
        },
        {
          provide: SOURCE_QUERY,
          useClass: SourcePgDrizzleQuery,
        },
        {
          provide: SOURCE_LOOKUP,
          useClass: SourceFromRepositoryLookup,
        },
        SourceContentSnapshotCalculator,
        ListSourcesUseCase,
        GetSourceUseCase,
        GetSourceSyncJobUseCase,
        UploadSourceUseCase,
      ],
      exports: [
        SOURCE_REPOSITORY,
        SOURCE_SYNC_JOB_REPOSITORY,
        SOURCE_LOOKUP,
        ListSourcesUseCase,
        GetSourceUseCase,
        GetSourceSyncJobUseCase,
        UploadSourceUseCase,
      ],
    };
  }

  static forRoot(_options: SourcesModuleOptions = {}): DynamicModule {
    return {
      module: SourcesModule,
      imports: [SourcesModule.forFeature()],
      controllers: [SourcesHttpController, SourceSyncJobsHttpController],
      providers: [HandleIngestionResultHandler],
    };
  }
}
