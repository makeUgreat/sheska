import { Module, type DynamicModule } from '@nestjs/common';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { PublishPostUseCase } from '@contexts/posts/application/use-cases/publish-post.use-case';
import { GetPostUseCase } from '@contexts/posts/application/use-cases/get-post.use-case';
import { ListPostsUseCase } from '@contexts/posts/application/use-cases/list-posts.use-case';
import { SearchPostsUseCase } from '@contexts/posts/application/use-cases/search-posts.use-case';
import { CountPostsUseCase } from '@contexts/posts/application/use-cases/count-posts.use-case';
import { UpdatePostTitleUseCase } from '@contexts/posts/application/use-cases/update-post-title.use-case';
import { PostPgDrizzleRepository } from '@contexts/posts/infrastructure/persistence/postgres-drizzle/post.pg-drizzle.repository';
import { PostPgDrizzleQuery } from '@contexts/posts/infrastructure/persistence/postgres-drizzle/post.pg-drizzle.query';
import * as postsSchema from '@contexts/posts/infrastructure/persistence/postgres-drizzle/schema';
import { SourceFromSourcesLookup } from '@contexts/posts/infrastructure/sources/source.from-sources.lookup';
import { SearchQueryFromIngestionEmbedder } from '@contexts/posts/infrastructure/ingestion/search-query.from-ingestion.embedder';
import { PostsHttpController } from '@contexts/posts/presentation/http/posts-http.controller';
import {
  type SourceRepository,
  SOURCE_REPOSITORY,
} from '@contexts/sources/sources.di-tokens';
import { SourcesModule } from '@contexts/sources/sources.module';
import {
  type Embedder,
  EMBEDDER,
} from '@contexts/ingestion/ingestion.di-tokens';
import { IngestionModule } from '@contexts/ingestion/ingestion.module';
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
      imports: [SourcesModule.forRoot(), IngestionModule.forRoot()],
      controllers: [PostsHttpController],
      providers: [
        {
          provide: POST_REPOSITORY,
          useFactory: (db: NodePgDatabase<typeof postsSchema>) =>
            new PostPgDrizzleRepository(db),
          inject: [DATABASE_TOKENS.drizzleDatabase],
        },
        {
          provide: POST_QUERY,
          useFactory: (db: NodePgDatabase<typeof postsSchema>) =>
            new PostPgDrizzleQuery(db),
          inject: [DATABASE_TOKENS.drizzleDatabase],
        },
        {
          provide: SOURCE_LOOKUP,
          useFactory: (sourceRepository: SourceRepository) =>
            new SourceFromSourcesLookup(sourceRepository),
          inject: [SOURCE_REPOSITORY],
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
