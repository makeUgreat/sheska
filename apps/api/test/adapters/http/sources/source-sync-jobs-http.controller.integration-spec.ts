import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOGGER } from '@kernels/application';
import {
  INFRASTRUCTURE_ERROR_KIND,
  InfrastructureException,
} from '@kernels/infrastructure';
import { GetSourceSyncJobUseCase } from '@contexts/sources/application/use-cases/get-source-sync-job.use-case';
import { SourceSyncJobsHttpController } from '@contexts/sources/presentation/http/source-sync-jobs-http.controller';
import { HttpExceptionFilter } from '@platform/nest/filters/http-exception.filter';

describe('SourceSyncJobsHttpController', () => {
  let app: INestApplication;
  let httpServer: Server;
  const execute = vi.fn<GetSourceSyncJobUseCase['execute']>();

  beforeEach(async () => {
    execute.mockReset();
    const testingModule = await Test.createTestingModule({
      controllers: [SourceSyncJobsHttpController],
      providers: [
        { provide: GetSourceSyncJobUseCase, useValue: { execute } },
        {
          provide: LOGGER,
          useValue: {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
          },
        },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    }).compile();
    app = testingModule.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => app.close());

  it('GET /sync-jobs/:id가 sync job 상태를 반환한다', async () => {
    const createdAt = new Date('2026-09-09T00:00:00.000Z');
    execute.mockResolvedValue({
      syncJobId: 'sync-job-1',
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'processing',
      totalChunks: 3,
      processedChunks: 1,
      createdAt,
    });

    const response = await request(httpServer)
      .get('/sync-jobs/sync-job-1')
      .expect(200);

    expect(response.body).toEqual({
      syncJobId: 'sync-job-1',
      sourceId: 'source-1',
      fingerprint: 'fingerprint-1',
      status: 'processing',
      totalChunks: 3,
      processedChunks: 1,
      createdAt: createdAt.toISOString(),
    });
    expect(execute).toHaveBeenCalledWith({ syncJobId: 'sync-job-1' });
  });

  it('sync job이 없으면 404 응답을 반환한다', async () => {
    execute.mockRejectedValue(
      new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.NOT_FOUND,
        code: 'source_sync_job.not_found',
        source: {
          boundary: 'persistence',
          adapter: 'source-sync-job.pg-drizzle',
        },
        message: 'Source sync job not found',
        details: { id: 'missing' },
      }),
    );

    await request(httpServer).get('/sync-jobs/missing').expect(404);
  });
});
