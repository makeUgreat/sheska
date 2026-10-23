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
import { type z } from 'zod';
import { type ApiRequest, type ApiResponse, SourceApi } from '@sheska/contract';
import { ErrorCodes, ZodValidationPipe } from '@kernels/presentation';
import { UploadSourceUseCase } from '@contexts/library/application/use-cases/upload-source.use-case';
import { ListSourcesUseCase } from '@contexts/library/application/use-cases/list-sources.use-case';
import { GetSourceUseCase } from '@contexts/library/application/use-cases/get-source.use-case';
import { type SourceQueryPaginateResult } from '@contexts/library/application/ports';

type SourceSummary = SourceQueryPaginateResult['sources'][number];

@Controller()
export class SourcesHttpController {
  constructor(
    private readonly uploadSourceUseCase: UploadSourceUseCase,
    private readonly listSourcesUseCase: ListSourcesUseCase,
    private readonly getSourceUseCase: GetSourceUseCase,
  ) {}

  @Get(SourceApi.list.path)
  @ErrorCodes(SourceApi.list.errors)
  async list(
    @Query(new ZodValidationPipe(SourceApi.list.query))
    query: z.output<typeof SourceApi.list.query>,
  ): Promise<ApiResponse<typeof SourceApi.list>> {
    const result = await this.listSourcesUseCase.execute(query);

    return SourceApi.list.response.parse({
      sources: result.sources.map(toSourceSummaryResponse),
      page: result.page,
      pageSize: result.pageSize,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
    });
  }

  @Get(SourceApi.get.path)
  @ErrorCodes(SourceApi.get.errors)
  async get(
    @Param('id') id: string,
  ): Promise<ApiResponse<typeof SourceApi.get>> {
    const result = await this.getSourceUseCase.execute({ sourceId: id });

    return SourceApi.get.response.parse({
      ...toSourceSummaryResponse(result),
      frontmatter: result.frontmatter,
      body: result.body,
      embedding: result.embedding
        ? {
            model: result.embedding.model,
            dimensions: result.embedding.dimensions,
            createdAt: result.embedding.createdAt.toISOString(),
            updatedAt: result.embedding.updatedAt.toISOString(),
          }
        : null,
    });
  }

  @Post(SourceApi.upload.path)
  @HttpCode(HttpStatus.CREATED)
  @ErrorCodes(SourceApi.upload.errors)
  async upload(
    @Body(new ZodValidationPipe(SourceApi.upload.request))
    body: ApiRequest<typeof SourceApi.upload>,
  ): Promise<ApiResponse<typeof SourceApi.upload>> {
    const result = await this.uploadSourceUseCase.execute(body);

    return SourceApi.upload.response.parse(
      result satisfies ApiResponse<typeof SourceApi.upload>,
    );
  }
}

function toSourceSummaryResponse(source: SourceSummary) {
  return {
    sourceId: source.sourceId,
    externalSourceId: source.externalSourceId,
    title: source.title,
    fingerprint: source.fingerprint,
    sizeBytes: source.sizeBytes,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
    latestSyncJob: source.latestSyncJob
      ? {
          syncJobId: source.latestSyncJob.syncJobId,
          status: source.latestSyncJob.status,
          totalChunks: source.latestSyncJob.totalChunks,
          createdAt: source.latestSyncJob.createdAt.toISOString(),
        }
      : null,
    publishedPostId: source.publishedPostId,
  };
}
