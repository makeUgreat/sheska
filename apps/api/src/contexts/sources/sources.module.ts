import { Module, type DynamicModule } from '@nestjs/common';
import { SourceContentSnapshotCalculator } from '@contexts/sources/application/services/source-content-snapshot-calculator.service';
import { SourceFromRepositoryLookup } from '@contexts/sources/application/services/source.from-repository.lookup';
import { GetSourceUseCase } from '@contexts/sources/application/use-cases/get-source.use-case';
import { GetSourceSyncJobUseCase } from '@contexts/sources/application/use-cases/get-source-sync-job.use-case';
import { ListSourcesUseCase } from '@contexts/sources/application/use-cases/list-sources.use-case';
import { UploadSourceUseCase } from '@contexts/sources/application/use-cases/upload-source.use-case';
import { ApplyIngestionUpdateUseCase } from '@contexts/sources/application/use-cases/apply-ingestion-update.use-case';
import { SourceSha256Fingerprinter } from '@contexts/sources/infrastructure/fingerprinter/source.sha256.fingerprinter';
import { SourceDocumentYamlParser } from '@contexts/sources/infrastructure/parser/source-document.yaml.parser';
import { SourcePgDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { SourceSyncJobPgDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source-sync-job.pg-drizzle.repository';
import { SourceEmbeddingFromIngestionLookup } from '@contexts/sources/acl/ingestion/source-embedding.from-ingestion.lookup';
import { SyncJobProgressFromIngestionLookup } from '@contexts/sources/acl/ingestion/sync-job-progress.from-ingestion.lookup';
import { SourcePgDrizzleQuery } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.query';
import { NotePgDrizzleQuery } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/note.pg-drizzle.query';
import { SourcesPgDrizzleUnitOfWork } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/sources.pg-drizzle.unit-of-work';
import { SourcesHttpController } from '@contexts/sources/presentation/http/sources.http.controller';
import { NotesHttpController } from '@contexts/sources/presentation/http/notes.http.controller';
import { GetNoteUseCase } from '@contexts/sources/application/use-cases/get-note.use-case';
import { ListNotesUseCase } from '@contexts/sources/application/use-cases/list-notes.use-case';
import { SourceSyncJobsHttpController } from '@contexts/sources/presentation/http/source-sync-jobs.http.controller';
import { IngestionIntegrationEventConsumer } from '@contexts/sources/presentation/events/ingestion.integration-event.consumer';
import { OutboxDeadLetteredIntegrationEventConsumer } from '@contexts/sources/presentation/events/outbox-dead-lettered.integration-event.consumer';
import {
  type SourceEmbeddingLookup as IngestionSourceEmbeddingLookup,
  SOURCE_EMBEDDING_LOOKUP as INGESTION_SOURCE_EMBEDDING_LOOKUP,
  EMBEDDING_WORKFLOW_PROGRESS_LOOKUP,
  type EmbeddingWorkflowProgressLookup,
  IngestionModule,
} from '@contexts/ingestion';
import {
  SOURCE_FINGERPRINTER,
  SOURCE_DOCUMENT_PARSER,
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
  SOURCE_EMBEDDING_LOOKUP,
  SOURCE_QUERY,
  NOTE_QUERY,
  SOURCE_LOOKUP,
  SOURCES_UNIT_OF_WORK,
  SYNC_JOB_PROGRESS_LOOKUP,
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
          provide: SOURCE_DOCUMENT_PARSER,
          useClass: SourceDocumentYamlParser,
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
          provide: NOTE_QUERY,
          useClass: NotePgDrizzleQuery,
        },
        {
          provide: SOURCE_LOOKUP,
          useClass: SourceFromRepositoryLookup,
        },
        {
          provide: SYNC_JOB_PROGRESS_LOOKUP,
          useFactory: (progress: EmbeddingWorkflowProgressLookup) =>
            new SyncJobProgressFromIngestionLookup(progress),
          inject: [EMBEDDING_WORKFLOW_PROGRESS_LOOKUP],
        },
        SourceContentSnapshotCalculator,
        ListSourcesUseCase,
        GetSourceUseCase,
        GetSourceSyncJobUseCase,
        UploadSourceUseCase,
        ListNotesUseCase,
        GetNoteUseCase,
      ],
      exports: [
        SOURCE_REPOSITORY,
        SOURCE_SYNC_JOB_REPOSITORY,
        SOURCE_LOOKUP,
        ListSourcesUseCase,
        GetSourceUseCase,
        GetSourceSyncJobUseCase,
        UploadSourceUseCase,
        ListNotesUseCase,
        GetNoteUseCase,
      ],
    };
  }

  static forRoot(_options: SourcesModuleOptions = {}): DynamicModule {
    return {
      module: SourcesModule,
      imports: [SourcesModule.forFeature()],
      controllers: [
        SourcesHttpController,
        SourceSyncJobsHttpController,
        NotesHttpController,
      ],
      providers: [
        ApplyIngestionUpdateUseCase,
        IngestionIntegrationEventConsumer,
        OutboxDeadLetteredIntegrationEventConsumer,
      ],
    };
  }
}
