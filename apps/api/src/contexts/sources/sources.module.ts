import { Module, type DynamicModule } from '@nestjs/common';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { SourceContentSnapshotCalculator } from '@contexts/sources/application/services/source-content-snapshot-calculator.service';
import { GetSourceUseCase } from '@contexts/sources/application/use-cases/get-source.use-case';
import { ListSourcesUseCase } from '@contexts/sources/application/use-cases/list-sources.use-case';
import { UploadSourceUseCase } from '@contexts/sources/application/use-cases/upload-source.use-case';
import { SourceSha256Fingerprinter } from '@contexts/sources/infrastructure/fingerprinter/source.sha256.fingerprinter';
import * as sourcesSchema from '@contexts/sources/infrastructure/persistence/postgres-drizzle/schema';
import { SourcePgDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { SourceSyncJobPgDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source-sync-job.pg-drizzle.repository';
import { SourceEmbeddingIngestionLookup } from '@contexts/sources/infrastructure/ingestion/source-embedding.ingestion.lookup';
import { SourcesHttpController } from '@contexts/sources/presentation/http/sources-http.controller';
import { HandleIngestionResultHandler } from '@contexts/sources/application/event-handlers/handle-ingestion-result.handler';
import {
  type SourceVectorRepository,
  SOURCE_VECTOR_REPOSITORY,
} from '@contexts/ingestion/ingestion.di-tokens';
import { IngestionModule } from '@contexts/ingestion/ingestion.module';
import {
  SOURCE_FINGERPRINTER,
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
  SOURCE_EMBEDDING_LOOKUP,
} from './sources.di-tokens';

export type SourcesModuleOptions = Record<string, never>;

@Module({})
export class SourcesModule {
  static forRoot(_options: SourcesModuleOptions = {}): DynamicModule {
    return {
      module: SourcesModule,
      imports: [IngestionModule.forRoot()],
      controllers: [SourcesHttpController],
      providers: [
        {
          provide: SOURCE_FINGERPRINTER,
          useClass: SourceSha256Fingerprinter,
        },
        SourceContentSnapshotCalculator,
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
          useFactory: (vectorRepo: SourceVectorRepository) =>
            new SourceEmbeddingIngestionLookup(vectorRepo),
          inject: [SOURCE_VECTOR_REPOSITORY],
        },
        ListSourcesUseCase,
        GetSourceUseCase,
        UploadSourceUseCase,
        HandleIngestionResultHandler,
      ],
      exports: [ListSourcesUseCase, GetSourceUseCase, UploadSourceUseCase],
    };
  }
}
