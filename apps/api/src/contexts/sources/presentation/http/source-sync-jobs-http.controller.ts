import { Controller, Get, Param } from '@nestjs/common';
import { GetSourceSyncJobUseCase } from '@contexts/sources/application/use-cases/get-source-sync-job.use-case';
import { type GetSourceSyncJobHttpResponse } from './dto/get-source-sync-job.http.dto';

@Controller('sync-jobs')
export class SourceSyncJobsHttpController {
  constructor(private readonly getSourceSyncJob: GetSourceSyncJobUseCase) {}

  @Get(':id')
  async get(@Param('id') id: string): Promise<GetSourceSyncJobHttpResponse> {
    const result = await this.getSourceSyncJob.execute({ syncJobId: id });
    return {
      ...result,
      createdAt: result.createdAt.toISOString(),
    };
  }
}
