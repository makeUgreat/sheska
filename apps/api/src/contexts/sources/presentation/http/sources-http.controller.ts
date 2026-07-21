import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { UploadSourceUseCase } from '@contexts/sources/application/use-cases/upload-source.use-case';
import { ListSourcesUseCase } from '@contexts/sources/application/use-cases/list-sources.use-case';
import { GetSourceUseCase } from '@contexts/sources/application/use-cases/get-source.use-case';
import {
  UploadSourceHttpRequest,
  type UploadSourceHttpResponse,
} from './dto/upload-source.http.dto';
import { type ListSourcesHttpResponse } from './dto/list-sources.http.dto';
import { type GetSourceHttpResponse } from './dto/get-source.http.dto';

@Controller('sources')
export class SourcesHttpController {
  constructor(
    private readonly uploadSourceUseCase: UploadSourceUseCase,
    private readonly listSourcesUseCase: ListSourcesUseCase,
    private readonly getSourceUseCase: GetSourceUseCase,
  ) {}

  @Get()
  async list(): Promise<ListSourcesHttpResponse> {
    const result = await this.listSourcesUseCase.execute();
    return {
      sources: result.sources.map((s) => ({
        sourceId: s.sourceId,
        externalSourceId: s.externalSourceId,
        fingerprint: s.fingerprint,
        sizeBytes: s.sizeBytes,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        latestSyncJob: s.latestSyncJob
          ? {
              syncJobId: s.latestSyncJob.syncJobId,
              status: s.latestSyncJob.status,
              totalChunks: s.latestSyncJob.totalChunks,
              processedChunks: s.latestSyncJob.processedChunks,
              createdAt: s.latestSyncJob.createdAt.toISOString(),
            }
          : null,
      })),
    };
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<GetSourceHttpResponse> {
    const result = await this.getSourceUseCase.execute({ sourceId: id });

    return {
      sourceId: result.sourceId,
      externalSourceId: result.externalSourceId,
      content: result.content,
      fingerprint: result.fingerprint,
      sizeBytes: result.sizeBytes,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      latestSyncJob: result.latestSyncJob
        ? {
            syncJobId: result.latestSyncJob.syncJobId,
            status: result.latestSyncJob.status,
            totalChunks: result.latestSyncJob.totalChunks,
            processedChunks: result.latestSyncJob.processedChunks,
            createdAt: result.latestSyncJob.createdAt.toISOString(),
          }
        : null,
      embedding: result.embedding
        ? {
            model: result.embedding.model,
            dimensions: result.embedding.dimensions,
            createdAt: result.embedding.createdAt.toISOString(),
            updatedAt: result.embedding.updatedAt.toISOString(),
          }
        : null,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Body() request: UploadSourceHttpRequest,
  ): Promise<UploadSourceHttpResponse> {
    const result = await this.uploadSourceUseCase.execute({
      externalSourceId: request.externalSourceId,
      content: request.content,
    });

    return {
      sourceId: result.sourceId,
      externalSourceId: result.externalSourceId,
      fingerprint: result.fingerprint,
      syncJobId: result.syncJobId,
    };
  }
}
