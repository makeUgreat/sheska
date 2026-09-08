import { Module, type DynamicModule } from '@nestjs/common';
import { PublishPostUseCase } from '@contexts/posts/application/use-cases/publish-post.use-case';
import { GetPostUseCase } from '@contexts/posts/application/use-cases/get-post.use-case';
import { ListPostsUseCase } from '@contexts/posts/application/use-cases/list-posts.use-case';
import { SearchPostsUseCase } from '@contexts/posts/application/use-cases/search-posts.use-case';
import { CountPostsUseCase } from '@contexts/posts/application/use-cases/count-posts.use-case';
import { UpdatePostTitleUseCase } from '@contexts/posts/application/use-cases/update-post-title.use-case';
import { PostPgDrizzleRepository } from '@contexts/posts/infrastructure/persistence/postgres-drizzle/post.pg-drizzle.repository';
import { PostPgDrizzleQuery } from '@contexts/posts/infrastructure/persistence/postgres-drizzle/post.pg-drizzle.query';
import { SourceFromSourcesLookup } from '@contexts/posts/acl/sources/source.from-sources.lookup';
import { SearchQueryFromIngestionEmbedder } from '@contexts/posts/acl/ingestion/search-query.from-ingestion.embedder';
import { PostsHttpController } from '@contexts/posts/presentation/http/posts-http.controller';
import {
  type SourceLookup as SourcesSourceLookup,
  SOURCE_LOOKUP as SOURCES_SOURCE_LOOKUP,
  SourcesModule,
} from '@contexts/sources';
import { type Embedder, EMBEDDER, IngestionModule } from '@contexts/ingestion';
import {
  POST_QUERY,
  POST_REPOSITORY,
  SOURCE_LOOKUP,
  SEARCH_QUERY_EMBEDDER,
} from './posts.di-tokens';

export type PostsModuleOptions = Record<string, never>;

@Module({})
export class PostsModule {
  static forRoot(_options: PostsModuleOptions = {}): DynamicModule {
    return {
      module: PostsModule,
      imports: [SourcesModule.forFeature(), IngestionModule.forFeature()],
      controllers: [PostsHttpController],
      providers: [
        {
          provide: POST_REPOSITORY,
          useClass: PostPgDrizzleRepository,
        },
        {
          provide: POST_QUERY,
          useClass: PostPgDrizzleQuery,
        },
        {
          provide: SOURCE_LOOKUP,
          useFactory: (sourcesLookup: SourcesSourceLookup) =>
            new SourceFromSourcesLookup(sourcesLookup),
          inject: [SOURCES_SOURCE_LOOKUP],
        },
        {
          provide: SEARCH_QUERY_EMBEDDER,
          useFactory: (embedder: Embedder) =>
            new SearchQueryFromIngestionEmbedder(embedder),
          inject: [EMBEDDER],
        },
        PublishPostUseCase,
        GetPostUseCase,
        ListPostsUseCase,
        SearchPostsUseCase,
        CountPostsUseCase,
        UpdatePostTitleUseCase,
      ],
      exports: [
        PublishPostUseCase,
        GetPostUseCase,
        ListPostsUseCase,
        SearchPostsUseCase,
        CountPostsUseCase,
        UpdatePostTitleUseCase,
      ],
    };
  }
}
