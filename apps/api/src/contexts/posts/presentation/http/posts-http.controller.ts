import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { PublishPostUseCase } from '@contexts/posts/application/use-cases/publish-post.use-case';
import { GetPostUseCase } from '@contexts/posts/application/use-cases/get-post.use-case';
import { ListPostsUseCase } from '@contexts/posts/application/use-cases/list-posts.use-case';
import {
  PublishPostHttpRequest,
  type PublishPostHttpResponse,
} from './dto/publish-post.http.dto';
import { type GetPostHttpResponse } from './dto/get-post.http.dto';
import { type ListPostsHttpResponse } from './dto/list-posts.http.dto';

@Controller('posts')
export class PostsHttpController {
  constructor(
    private readonly publishPostUseCase: PublishPostUseCase,
    private readonly getPostUseCase: GetPostUseCase,
    private readonly listPostsUseCase: ListPostsUseCase,
  ) {}

  @Get()
  async list(): Promise<ListPostsHttpResponse> {
    const result = await this.listPostsUseCase.execute();

    return {
      posts: result.posts.map((post) => ({
        postId: post.postId,
        sourceId: post.sourceId,
        title: post.title,
        viewCount: post.viewCount,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      })),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async publish(
    @Body() request: PublishPostHttpRequest,
  ): Promise<PublishPostHttpResponse> {
    const result = await this.publishPostUseCase.execute({
      sourceId: request.sourceId,
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
    };
  }
}
