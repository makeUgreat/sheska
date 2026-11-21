import { Module, type DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SourceContentSnapshotCalculator } from '@contexts/library/application/services/source-content-snapshot-calculator.service';
import { SourceFromRepositoryLookup } from '@contexts/library/application/services/source.from-repository.lookup';
import { GetSourceUseCase } from '@contexts/library/application/use-cases/get-source.use-case';
import { GetSourceSyncJobUseCase } from '@contexts/library/application/use-cases/get-source-sync-job.use-case';
import { ListSourcesUseCase } from '@contexts/library/application/use-cases/list-sources.use-case';
import { UploadSourceUseCase } from '@contexts/library/application/use-cases/upload-source.use-case';
import { ApplyIngestionUpdateUseCase } from '@contexts/library/application/use-cases/apply-ingestion-update.use-case';
import { SourceDocumentYamlParser } from '@contexts/library/infrastructure/parser/source-document.yaml.parser';
import { SourcePgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { SourceSyncJobPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source-sync-job.pg-drizzle.repository';
import { SourceEmbeddingFromIngestionLookup } from '@contexts/library/acl/ingestion/source-embedding.from-ingestion.lookup';
import { SyncJobProgressFromIngestionLookup } from '@contexts/library/acl/ingestion/sync-job-progress.from-ingestion.lookup';
import { SearchQueryFromIngestionEmbedder } from '@contexts/library/acl/ingestion/search-query.from-ingestion.embedder';
import { SourcePgDrizzleQuery } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.query';
import { PostPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post.pg-drizzle.repository';
import { PostPgDrizzleQuery } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post.pg-drizzle.query';
import { PostViewPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post-view.pg-drizzle.repository';
import { PostViewPgDrizzleQuery } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post-view.pg-drizzle.query';
import { LibraryPgDrizzleUnitOfWork } from '@contexts/library/infrastructure/persistence/postgres-drizzle/library.pg-drizzle.unit-of-work';
import { SourcesHttpController } from '@contexts/library/presentation/http/sources.http.controller';
import { AttachmentsHttpController } from '@contexts/library/presentation/http/attachments.http.controller';
import { UploadAttachmentUseCase } from '@contexts/library/application/use-cases/upload-attachment.use-case';
import { AttachmentImageOptimizer } from '@contexts/library/application/services/attachment-image-optimizer.service';
import { AttachmentImageSharpCodec } from '@contexts/library/infrastructure/attachment-image/sharp/attachment-image.sharp.codec';
import { AttachmentContentR2Store } from '@contexts/library/infrastructure/attachment-content/r2/attachment-content.r2.store';
import { PostsHttpController } from '@contexts/library/presentation/http/posts.http.controller';
import { PublishPostUseCase } from '@contexts/library/application/use-cases/publish-post.use-case';
import { GetPostUseCase } from '@contexts/library/application/use-cases/get-post.use-case';
import { RecordPostViewUseCase } from '@contexts/library/application/use-cases/record-post-view.use-case';
import { ListPostViewsUseCase } from '@contexts/library/application/use-cases/list-post-views.use-case';
import { ListPostsUseCase } from '@contexts/library/application/use-cases/list-posts.use-case';
import { SearchPostsUseCase } from '@contexts/library/application/use-cases/search-posts.use-case';
import { CountPostsUseCase } from '@contexts/library/application/use-cases/count-posts.use-case';
import { SourceSyncJobsHttpController } from '@contexts/library/presentation/http/source-sync-jobs.http.controller';
import { IngestionIntegrationEventConsumer } from '@contexts/library/presentation/events/ingestion.integration-event.consumer';
import { OutboxDeadLetteredIntegrationEventConsumer } from '@contexts/library/presentation/events/outbox-dead-lettered.integration-event.consumer';
import { PostSummaryOutboxMessageConsumer } from '@contexts/library/presentation/events/post-summary.outbox-message.consumer';
import { RequestPostSummaryUseCase } from '@contexts/library/application/use-cases/request-post-summary.use-case';
import { PostSummaryJobBullMqDispatcher } from '@contexts/library/infrastructure/queue/bullmq/post-summary-job.bullmq.dispatcher';
import { POST_SUMMARY_QUEUE } from '@contexts/library/application/ports';
import {
  type SourceEmbeddingLookup as IngestionSourceEmbeddingLookup,
  SOURCE_EMBEDDING_LOOKUP as INGESTION_SOURCE_EMBEDDING_LOOKUP,
  EMBEDDING_WORKFLOW_PROGRESS_LOOKUP,
  type EmbeddingWorkflowProgressLookup,
  type TextEmbedder,
  TEXT_EMBEDDER,
  IngestionModule,
} from '@contexts/ingestion';
import {
  SOURCE_DOCUMENT_PARSER,
  SOURCE_REPOSITORY,
  SOURCE_SYNC_JOB_REPOSITORY,
  SOURCE_EMBEDDING_LOOKUP,
  SOURCE_QUERY,
  SOURCE_LOOKUP,
  LIBRARY_UNIT_OF_WORK,
  SYNC_JOB_PROGRESS_LOOKUP,
  POST_REPOSITORY,
  POST_QUERY,
  POST_VIEW_REPOSITORY,
  POST_VIEW_QUERY,
  POST_SUMMARY_JOB_DISPATCHER,
  SEARCH_QUERY_EMBEDDER,
  ATTACHMENT_IMAGE_CODEC,
  ATTACHMENT_CONTENT_STORE,
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
          useFactory: (ingestionLookup: IngestionSourceEmbeddingLookup) => new SourceEmbeddingFromIngestionLookup(ingestionLookup),
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
        {
          provide: SYNC_JOB_PROGRESS_LOOKUP,
          useFactory: (progress: EmbeddingWorkflowProgressLookup) => new SyncJobProgressFromIngestionLookup(progress),
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
          provide: POST_VIEW_REPOSITORY,
          useClass: PostViewPgDrizzleRepository,
        },
        {
          provide: POST_VIEW_QUERY,
          useClass: PostViewPgDrizzleQuery,
        },
        {
          provide: SEARCH_QUERY_EMBEDDER,
          useFactory: (embedder: TextEmbedder) => new SearchQueryFromIngestionEmbedder(embedder),
          inject: [TEXT_EMBEDDER],
        },
        {
          provide: ATTACHMENT_IMAGE_CODEC,
          useClass: AttachmentImageSharpCodec,
        },
        {
          provide: ATTACHMENT_CONTENT_STORE,
          useClass: AttachmentContentR2Store,
        },
        SourceContentSnapshotCalculator,
        AttachmentImageOptimizer,
        ListSourcesUseCase,
        GetSourceUseCase,
        GetSourceSyncJobUseCase,
        UploadSourceUseCase,
        PublishPostUseCase,
        GetPostUseCase,
        RecordPostViewUseCase,
        ListPostViewsUseCase,
        ListPostsUseCase,
        SearchPostsUseCase,
        CountPostsUseCase,
        UploadAttachmentUseCase,
      ],
      exports: [
        SOURCE_REPOSITORY,
        SOURCE_SYNC_JOB_REPOSITORY,
        SOURCE_LOOKUP,
        POST_QUERY,
        ListSourcesUseCase,
        GetSourceUseCase,
        GetSourceSyncJobUseCase,
        UploadSourceUseCase,
        PublishPostUseCase,
        GetPostUseCase,
        RecordPostViewUseCase,
        ListPostViewsUseCase,
        ListPostsUseCase,
        SearchPostsUseCase,
        CountPostsUseCase,
        UploadAttachmentUseCase,
      ],
    };
  }

  static forRoot(_options: LibraryModuleOptions = {}): DynamicModule {
    return {
      module: LibraryModule,
      imports: [LibraryModule.forFeature(), BullModule.registerQueue({ name: POST_SUMMARY_QUEUE })],
      controllers: [SourcesHttpController, SourceSyncJobsHttpController, PostsHttpController, AttachmentsHttpController],
      providers: [
        ApplyIngestionUpdateUseCase,
        IngestionIntegrationEventConsumer,
        OutboxDeadLetteredIntegrationEventConsumer,
        RequestPostSummaryUseCase,
        PostSummaryOutboxMessageConsumer,
        {
          provide: POST_SUMMARY_JOB_DISPATCHER,
          useClass: PostSummaryJobBullMqDispatcher,
        },
      ],
    };
  }
}
