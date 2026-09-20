import { Module, type DynamicModule } from '@nestjs/common';
import { SourceContentSnapshotCalculator } from '@contexts/library/application/services/source-content-snapshot-calculator.service';
import { SourceFromRepositoryLookup } from '@contexts/library/application/services/source.from-repository.lookup';
import { GetSourceUseCase } from '@contexts/library/application/use-cases/get-source.use-case';
import { GetSourceSyncJobUseCase } from '@contexts/library/application/use-cases/get-source-sync-job.use-case';
import { ListSourcesUseCase } from '@contexts/library/application/use-cases/list-sources.use-case';
import { UploadSourceUseCase } from '@contexts/library/application/use-cases/upload-source.use-case';
import { ApplyIngestionUpdateUseCase } from '@contexts/library/application/use-cases/apply-ingestion-update.use-case';
import { SourceSha256Fingerprinter } from '@contexts/library/infrastructure/fingerprinter/source.sha256.fingerprinter';
import { SourceDocumentYamlParser } from '@contexts/library/infrastructure/parser/source-document.yaml.parser';
import { SourcePgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { SourceSyncJobPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source-sync-job.pg-drizzle.repository';
import { SourceEmbeddingFromIngestionLookup } from '@contexts/library/acl/ingestion/source-embedding.from-ingestion.lookup';
import { SyncJobProgressFromIngestionLookup } from '@contexts/library/acl/ingestion/sync-job-progress.from-ingestion.lookup';
import { SearchQueryFromIngestionEmbedder } from '@contexts/library/acl/ingestion/search-query.from-ingestion.embedder';
import { SourcePgDrizzleQuery } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.query';
import { NotePgDrizzleQuery } from '@contexts/library/infrastructure/persistence/postgres-drizzle/note.pg-drizzle.query';
import { PostPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post.pg-drizzle.repository';
import { PostPgDrizzleQuery } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post.pg-drizzle.query';
import { LibraryPgDrizzleUnitOfWork } from '@contexts/library/infrastructure/persistence/postgres-drizzle/library.pg-drizzle.unit-of-work';
import { SourcesHttpController } from '@contexts/library/presentation/http/sources.http.controller';
import { PostsHttpController } from '@contexts/library/presentation/http/posts.http.controller';
import { NotesHttpController } from '@contexts/library/presentation/http/notes.http.controller';
import { GetNoteUseCase } from '@contexts/library/application/use-cases/get-note.use-case';
import { PublishPostUseCase } from '@contexts/library/application/use-cases/publish-post.use-case';
import { GetPostUseCase } from '@contexts/library/application/use-cases/get-post.use-case';
import { ListPostsUseCase } from '@contexts/library/application/use-cases/list-posts.use-case';
import { SearchPostsUseCase } from '@contexts/library/application/use-cases/search-posts.use-case';
import { CountPostsUseCase } from '@contexts/library/application/use-cases/count-posts.use-case';
import { ListNotesUseCase } from '@contexts/library/application/use-cases/list-notes.use-case';
import { SourceSyncJobsHttpController } from '@contexts/library/presentation/http/source-sync-jobs.http.controller';
import { IngestionIntegrationEventConsumer } from '@contexts/library/presentation/events/ingestion.integration-event.consumer';
import { OutboxDeadLetteredIntegrationEventConsumer } from '@contexts/library/presentation/events/outbox-dead-lettered.integration-event.consumer';
import {
  type SourceEmbeddingLookup as IngestionSourceEmbeddingLookup,
  SOURCE_EMBEDDING_LOOKUP as INGESTION_SOURCE_EMBEDDING_LOOKUP,
  EMBEDDING_WORKFLOW_PROGRESS_LOOKUP,
  type EmbeddingWorkflowProgressLookup,
  type Embedder,
  EMBEDDER,
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
  LIBRARY_UNIT_OF_WORK,
  SYNC_JOB_PROGRESS_LOOKUP,
  POST_REPOSITORY,
  POST_QUERY,
  SEARCH_QUERY_EMBEDDER,
} from './library.di-tokens';

export type LibraryModuleOptions = Record<string, never>;

@Module({})
export class LibraryModule {
  static forFeature(): DynamicModule {
    return {
      module: LibraryModule,
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
          provide: LIBRARY_UNIT_OF_WORK,
          useClass: LibraryPgDrizzleUnitOfWork,
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
        {
          provide: POST_REPOSITORY,
          useClass: PostPgDrizzleRepository,
        },
        {
          provide: POST_QUERY,
          useClass: PostPgDrizzleQuery,
        },
        {
          provide: SEARCH_QUERY_EMBEDDER,
          useFactory: (embedder: Embedder) =>
            new SearchQueryFromIngestionEmbedder(embedder),
          inject: [EMBEDDER],
        },
        SourceContentSnapshotCalculator,
        ListSourcesUseCase,
        GetSourceUseCase,
        GetSourceSyncJobUseCase,
        UploadSourceUseCase,
        ListNotesUseCase,
        GetNoteUseCase,
        PublishPostUseCase,
        GetPostUseCase,
        ListPostsUseCase,
        SearchPostsUseCase,
        CountPostsUseCase,
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
        PublishPostUseCase,
        GetPostUseCase,
        ListPostsUseCase,
        SearchPostsUseCase,
        CountPostsUseCase,
      ],
    };
  }

  static forRoot(_options: LibraryModuleOptions = {}): DynamicModule {
    return {
      module: LibraryModule,
      imports: [LibraryModule.forFeature()],
      controllers: [
        SourcesHttpController,
        SourceSyncJobsHttpController,
        NotesHttpController,
        PostsHttpController,
      ],
      providers: [
        ApplyIngestionUpdateUseCase,
        IngestionIntegrationEventConsumer,
        OutboxDeadLetteredIntegrationEventConsumer,
      ],
    };
  }
}
