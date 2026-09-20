import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { callContext } from '@core/call-context';
import { PublishPostUseCase } from '@contexts/library/application/use-cases/publish-post.use-case';
import { GetPostUseCase } from '@contexts/library/application/use-cases/get-post.use-case';
import { ListPostsUseCase } from '@contexts/library/application/use-cases/list-posts.use-case';
import { SearchPostsUseCase } from '@contexts/library/application/use-cases/search-posts.use-case';
import { CountPostsUseCase } from '@contexts/library/application/use-cases/count-posts.use-case';
import {
  PublishPostHttpRequest,
  type PublishPostHttpResponse,
} from './dto/publish-post.http.dto';
import { type GetPostHttpResponse } from './dto/get-post.http.dto';
import {
  ListPostsHttpRequest,
  type ListPostsHttpResponse,
} from './dto/list-posts.http.dto';
import { encodeCursor } from '@kernels/presentation';
import {
  SearchPostsHttpRequest,
  type SearchPostsHttpResponse,
} from './dto/search-posts.http.dto';
import { type CountPostsHttpResponse } from './dto/count-posts.http.dto';

@Controller('posts')
export class PostsHttpController {
  constructor(
    private readonly publishPostUseCase: PublishPostUseCase,
    private readonly getPostUseCase: GetPostUseCase,
    private readonly listPostsUseCase: ListPostsUseCase,
    private readonly searchPostsUseCase: SearchPostsUseCase,
    private readonly countPostsUseCase: CountPostsUseCase,
  ) {}

  @Get()
  async list(
    @Query() query: ListPostsHttpRequest,
  ): Promise<ListPostsHttpResponse> {
    const result = await this.listPostsUseCase.execute({
      cursor: query.cursor ?? null,
      limit: query.limit,
    });

    return {
      posts: result.posts.map((post) => ({
        postId: post.postId,
        sourceId: post.sourceId,
        title: post.title,
        viewCount: post.viewCount,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      })),
      nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async publish(
    @Body() request: PublishPostHttpRequest,
  ): Promise<PublishPostHttpResponse> {
    const result = await this.publishPostUseCase.execute({
      sourceId: request.sourceId,
    });

    return {
      postId: result.postId,
      sourceId: result.sourceId,
      title: result.title,
      viewCount: result.viewCount,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }

  @Get('search')
  async search(
    @Query() request: SearchPostsHttpRequest,
  ): Promise<SearchPostsHttpResponse> {
    const result = await this.searchPostsUseCase.execute(
      {
        query: request.q,
        cursor: request.cursor ?? null,
        limit: request.limit,
      },
      // 임베딩 검색이 실패하면 키워드 검색으로 fallback 한다.
      // 검색은 사용자 경험이 중요하므로 임베딩을 차라리 일찍 포기한다.
      callContext({ deadlineMs: 1_500, maxRetries: 1 }),
    );

    return {
      posts: result.posts.map((post) => ({
        postId: post.postId,
        sourceId: post.sourceId,
        title: post.title,
        viewCount: post.viewCount,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        matchReason: post.matchReason,
        similarity: post.similarity,
        snippet: post.snippet,
      })),
      nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
      semanticSearchApplied: result.semanticSearchApplied,
    };
  }

  @Get('count')
  async count(): Promise<CountPostsHttpResponse> {
    const count = await this.countPostsUseCase.execute();

    return { count };
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<GetPostHttpResponse> {
    const result = await this.getPostUseCase.execute({ postId: id });

    return {
      postId: result.postId,
      sourceId: result.sourceId,
      title: result.title,
      body: result.body,
      viewCount: result.viewCount,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }
}
