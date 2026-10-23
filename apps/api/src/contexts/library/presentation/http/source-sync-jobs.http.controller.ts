import { Controller, Get, Param } from '@nestjs/common';
import { type ApiResponse, SourceSyncJobApi } from '@sheska/contract';
import { ErrorCodes } from '@kernels/presentation';
import { GetSourceSyncJobUseCase } from '@contexts/library/application/use-cases/get-source-sync-job.use-case';

@Controller()
export class SourceSyncJobsHttpController {
  constructor(private readonly getSourceSyncJob: GetSourceSyncJobUseCase) {}

  @Get(SourceSyncJobApi.get.path)
  @ErrorCodes(SourceSyncJobApi.get.errors)
  async get(
    @Param('id') id: string,
  ): Promise<ApiResponse<typeof SourceSyncJobApi.get>> {
    const result = await this.getSourceSyncJob.execute({ syncJobId: id });

    return SourceSyncJobApi.get.response.parse({
      ...result,
      createdAt: result.createdAt.toISOString(),
    });
  }
}
