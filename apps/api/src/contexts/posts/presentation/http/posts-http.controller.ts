import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { computeDeadline } from '@core/deadline';
import { PublishPostUseCase } from '@contexts/posts/application/use-cases/publish-post.use-case';
import { GetPostUseCase } from '@contexts/posts/application/use-cases/get-post.use-case';
import { ListPostsUseCase } from '@contexts/posts/application/use-cases/list-posts.use-case';
import { SearchPostsUseCase } from '@contexts/posts/application/use-cases/search-posts.use-case';
import { CountPostsUseCase } from '@contexts/posts/application/use-cases/count-posts.use-case';
import { UpdatePostTitleUseCase } from '@contexts/posts/application/use-cases/update-post-title.use-case';
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
import {
  UpdatePostHttpRequest,
  type UpdatePostHttpResponse,
} from './dto/update-post.http.dto';

// Entry-point deadline for a search request. Currently only bounds the query
// embed call, so it starts at the same value as the use-case's own attempt
// timeout; widen this if the request later gains other time-bounded work.
const SEARCH_REQUEST_DEADLINE_MS = 1_000;

@Controller('posts')
export class PostsHttpController {
  constructor(
    private readonly publishPostUseCase: PublishPostUseCase,
    private readonly getPostUseCase: GetPostUseCase,
    private readonly listPostsUseCase: ListPostsUseCase,
    private readonly searchPostsUseCase: SearchPostsUseCase,
    private readonly countPostsUseCase: CountPostsUseCase,
    private readonly updatePostTitleUseCase: UpdatePostTitleUseCase,
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
    const deadline = computeDeadline(SEARCH_REQUEST_DEADLINE_MS);
    const result = await this.searchPostsUseCase.execute(
      {
        query: request.q,
        cursor: request.cursor ?? null,
        limit: request.limit,
      },
      deadline,
    );

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
      viewCount: result.viewCount,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      sourceContent: result.sourceContent,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() request: UpdatePostHttpRequest,
  ): Promise<UpdatePostHttpResponse> {
    const result = await this.updatePostTitleUseCase.execute({
      postId: id,
      title: request.title,
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
}
