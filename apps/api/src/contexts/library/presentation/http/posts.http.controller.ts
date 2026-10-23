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
import { z } from 'zod';
import {
  type ApiRequest,
  type ApiResponse,
  PostApi,
  type PostSummaryResponse,
} from '@sheska/contract';
import { callContext } from '@core/call-context';
import {
  cursorQueryParamSchema,
  encodeCursor,
  ErrorCodes,
  ZodValidationPipe,
} from '@kernels/presentation';
import { PublishPostUseCase } from '@contexts/library/application/use-cases/publish-post.use-case';
import { GetPostUseCase } from '@contexts/library/application/use-cases/get-post.use-case';
import { ListPostsUseCase } from '@contexts/library/application/use-cases/list-posts.use-case';
import { SearchPostsUseCase } from '@contexts/library/application/use-cases/search-posts.use-case';
import { CountPostsUseCase } from '@contexts/library/application/use-cases/count-posts.use-case';

const listPostsQuerySchema = PostApi.list.query.extend({
  cursor: cursorQueryParamSchema.optional(),
});

const searchPostsQuerySchema = PostApi.search.query.extend({
  cursor: cursorQueryParamSchema
    .pipe(z.object({ id: z.string(), score: z.number('Invalid cursor') }))
    .optional(),
});

interface PostSummary {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly viewCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

@Controller()
export class PostsHttpController {
  constructor(
    private readonly publishPostUseCase: PublishPostUseCase,
    private readonly getPostUseCase: GetPostUseCase,
    private readonly listPostsUseCase: ListPostsUseCase,
    private readonly searchPostsUseCase: SearchPostsUseCase,
    private readonly countPostsUseCase: CountPostsUseCase,
  ) {}

  @Get(PostApi.list.path)
  @ErrorCodes(PostApi.list.errors)
  async list(
    @Query(new ZodValidationPipe(listPostsQuerySchema))
    query: z.output<typeof listPostsQuerySchema>,
  ): Promise<ApiResponse<typeof PostApi.list>> {
    const result = await this.listPostsUseCase.execute({
      cursor: query.cursor ?? null,
      limit: query.limit,
    });

    return PostApi.list.response.parse({
      posts: result.posts.map(toPostSummaryResponse),
      nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
    } satisfies ApiResponse<typeof PostApi.list>);
  }

  @Post(PostApi.publish.path)
  @HttpCode(HttpStatus.CREATED)
  @ErrorCodes(PostApi.publish.errors)
  async publish(
    @Body(new ZodValidationPipe(PostApi.publish.request))
    body: ApiRequest<typeof PostApi.publish>,
  ): Promise<ApiResponse<typeof PostApi.publish>> {
    const result = await this.publishPostUseCase.execute({
      sourceId: body.sourceId,
    });

    return PostApi.publish.response.parse(
      toPostSummaryResponse(result) satisfies ApiResponse<
        typeof PostApi.publish
      >,
    );
  }

  // 정적 경로가 `:id`보다 먼저 등록되어야 한다.
  @Get(PostApi.search.path)
  @ErrorCodes(PostApi.search.errors)
  async search(
    @Query(new ZodValidationPipe(searchPostsQuerySchema))
    query: z.output<typeof searchPostsQuerySchema>,
  ): Promise<ApiResponse<typeof PostApi.search>> {
    const result = await this.searchPostsUseCase.execute(
      {
        query: query.q,
        cursor: query.cursor ?? null,
        limit: query.limit,
      },
      // 임베딩 검색이 실패하면 키워드 검색으로 fallback 한다.
      // 검색은 사용자 경험이 중요하므로 임베딩을 차라리 일찍 포기한다.
      callContext({ deadlineMs: 1_500, maxRetries: 1 }),
    );

    return PostApi.search.response.parse({
      posts: result.posts.map((post) => ({
        ...toPostSummaryResponse(post),
        matchReason: post.matchReason,
        similarity: post.similarity,
        snippet: post.snippet,
      })),
      nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
      semanticSearchApplied: result.semanticSearchApplied,
    } satisfies ApiResponse<typeof PostApi.search>);
  }

  @Get(PostApi.count.path)
  @ErrorCodes(PostApi.count.errors)
  async count(): Promise<ApiResponse<typeof PostApi.count>> {
    const count = await this.countPostsUseCase.execute();

    return PostApi.count.response.parse({
      count,
    } satisfies ApiResponse<typeof PostApi.count>);
  }

  @Get(PostApi.get.path)
  @ErrorCodes(PostApi.get.errors)
  async get(@Param('id') id: string): Promise<ApiResponse<typeof PostApi.get>> {
    const result = await this.getPostUseCase.execute({ postId: id });

    return PostApi.get.response.parse({
      ...toPostSummaryResponse(result),
      body: result.body,
    } satisfies ApiResponse<typeof PostApi.get>);
  }
}

function toPostSummaryResponse(post: PostSummary): PostSummaryResponse {
  return {
    postId: post.postId,
    sourceId: post.sourceId,
    title: post.title,
    viewCount: post.viewCount,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}
