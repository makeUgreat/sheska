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
import { PublishPostUseCase } from '@contexts/posts/application/use-cases/publish-post.use-case';
import { GetPostUseCase } from '@contexts/posts/application/use-cases/get-post.use-case';
import { ListPostsUseCase } from '@contexts/posts/application/use-cases/list-posts.use-case';
import { SearchPostsUseCase } from '@contexts/posts/application/use-cases/search-posts.use-case';
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
import { decodeCursor, encodeCursor } from '@kernels/application';
import { SearchPostsHttpRequest } from './dto/search-posts.http.dto';
import {
  UpdatePostHttpRequest,
  type UpdatePostHttpResponse,
} from './dto/update-post.http.dto';

@Controller('posts')
export class PostsHttpController {
  constructor(
    private readonly publishPostUseCase: PublishPostUseCase,
    private readonly getPostUseCase: GetPostUseCase,
    private readonly listPostsUseCase: ListPostsUseCase,
    private readonly searchPostsUseCase: SearchPostsUseCase,
    private readonly updatePostTitleUseCase: UpdatePostTitleUseCase,
  ) {}

  @Get()
  async list(
    @Query() query: ListPostsHttpRequest,
  ): Promise<ListPostsHttpResponse> {
    const result = await this.listPostsUseCase.execute({
      cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
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
  ): Promise<ListPostsHttpResponse> {
    const result = await this.searchPostsUseCase.execute({
      query: request.q,
      cursor: request.cursor ? decodeCursor(request.cursor) : undefined,
      limit: request.limit,
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
