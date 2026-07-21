import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { UploadSourceUseCase } from '@contexts/sources/application/use-cases/upload-source.use-case';
import { ListSourcesUseCase } from '@contexts/sources/application/use-cases/list-sources.use-case';
import { GetSourceUseCase } from '@contexts/sources/application/use-cases/get-source.use-case';
import {
  ApplicationException,
  APPLICATION_ERROR_KIND,
} from '@kernels/application';
import { SourcesHttpController } from '@contexts/sources/presentation/http/sources-http.controller';
import { HttpExceptionFilter } from '@platform/nest/filters/http-exception.filter';
import { ZodValidationPipe } from '@platform/nest/pipes/zod-validation.pipe';
import { LOGGER } from '@kernels/application';
import request from 'supertest';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from 'vitest';

type UploadSourceUseCaseMock = {
  execute: MockedFunction<UploadSourceUseCase['execute']>;
};

type ListSourcesUseCaseMock = {
  execute: MockedFunction<ListSourcesUseCase['execute']>;
};

type GetSourceUseCaseMock = {
  execute: MockedFunction<GetSourceUseCase['execute']>;
};

describe('SourcesHttpController', () => {
  let app: INestApplication;
  let httpServer: Server;
  let uploadSourceUseCase: UploadSourceUseCaseMock;
  let listSourcesUseCase: ListSourcesUseCaseMock;
  let getSourceUseCase: GetSourceUseCaseMock;

  beforeEach(async () => {
    uploadSourceUseCase = {
      execute: vi.fn<UploadSourceUseCase['execute']>(),
    };
    listSourcesUseCase = {
      execute: vi.fn<ListSourcesUseCase['execute']>(),
    };
    getSourceUseCase = {
      execute: vi.fn<GetSourceUseCase['execute']>(),
    };

    const testingModule = await Test.createTestingModule({
      controllers: [SourcesHttpController],
      providers: [
        {
          provide: UploadSourceUseCase,
          useValue: uploadSourceUseCase,
        },
        {
          provide: ListSourcesUseCase,
          useValue: listSourcesUseCase,
        },
        {
          provide: GetSourceUseCase,
          useValue: getSourceUseCase,
        },
        {
          provide: APP_PIPE,
          useClass: ZodValidationPipe,
        },
        {
          provide: LOGGER,
          useValue: {
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
          },
        },
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
      ],
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /sources', () => {
    it('source 목록을 latestSyncJob과 함께 200 응답으로 반환한다', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      listSourcesUseCase.execute.mockResolvedValue({
        sources: [
          {
            sourceId: 'source-1',
            externalSourceId: 'Notes/source.md',
            fingerprint: 'fingerprint-1',
            sizeBytes: 14,
            createdAt: now,
            updatedAt: now,
            latestSyncJob: {
              syncJobId: 'sync-job-1',
              status: 'completed',
              totalChunks: 3,
              processedChunks: 3,
              createdAt: now,
            },
            publishedPostId: 'post-1',
          },
        ],
        nextCursor: null,
      });

      const response = await request(httpServer).get('/sources').expect(200);

      expect(response.body).toEqual({
        sources: [
          {
            sourceId: 'source-1',
            externalSourceId: 'Notes/source.md',
            fingerprint: 'fingerprint-1',
            sizeBytes: 14,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            latestSyncJob: {
              syncJobId: 'sync-job-1',
              status: 'completed',
              totalChunks: 3,
              processedChunks: 3,
              createdAt: now.toISOString(),
            },
            publishedPostId: 'post-1',
          },
        ],
      });
      expect(listSourcesUseCase.execute).toHaveBeenCalledOnce();
    });

    it('source가 없으면 빈 배열을 반환한다', async () => {
      listSourcesUseCase.execute.mockResolvedValue({
        sources: [],
        nextCursor: null,
      });

      const response = await request(httpServer).get('/sources').expect(200);

      expect(response.body).toEqual({ sources: [] });
    });

    it('exception이 발생하면 500 응답으로 마스킹한다', async () => {
      listSourcesUseCase.execute.mockRejectedValue(
        new Error('Source Repository operation failed'),
      );

      const response = await request(httpServer).get('/sources').expect(500);

      expect(response.body).toEqual({
        statusCode: 500,
        code: 'internal.unexpected',
        message: 'Internal server error',
        details: {},
      });
    });
  });

  describe('GET /sources/:id', () => {
    it('source를 latestSyncJob과 embedding과 함께 200 응답으로 반환한다', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      getSourceUseCase.execute.mockResolvedValue({
        sourceId: 'source-1',
        externalSourceId: 'Notes/source.md',
        content: '# Source note',
        fingerprint: 'fingerprint-1',
        sizeBytes: 14,
        createdAt: now,
        updatedAt: now,
        latestSyncJob: {
          syncJobId: 'sync-job-1',
          status: 'completed',
          totalChunks: 3,
          processedChunks: 3,
          createdAt: now,
        },
        embedding: {
          model: 'qwen3-embedding:0.6b',
          dimensions: 1024,
          createdAt: now,
          updatedAt: now,
        },
        publishedPostId: 'post-1',
      });

      const response = await request(httpServer)
        .get('/sources/source-1')
        .expect(200);

      expect(response.body).toMatchObject({
        sourceId: 'source-1',
        externalSourceId: 'Notes/source.md',
        content: '# Source note',
        fingerprint: 'fingerprint-1',
        sizeBytes: 14,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        latestSyncJob: {
          syncJobId: 'sync-job-1',
          status: 'completed',
          totalChunks: 3,
          processedChunks: 3,
          createdAt: now.toISOString(),
        },
        embedding: {
          model: 'qwen3-embedding:0.6b',
          dimensions: 1024,
        },
        publishedPostId: 'post-1',
      });
      expect(getSourceUseCase.execute).toHaveBeenCalledWith({
        sourceId: 'source-1',
      });
    });

    it('source가 없으면 404 응답을 반환한다', async () => {
      getSourceUseCase.execute.mockRejectedValue(
        new ApplicationException({
          kind: APPLICATION_ERROR_KIND.NOT_FOUND,
          code: 'sources.source_not_found',
          message: 'Source not found',
          details: {},
        }),
      );

      const response = await request(httpServer)
        .get('/sources/non-existent')
        .expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        code: 'sources.source_not_found',
        message: 'Source not found',
        details: {},
      });
    });

    it('exception이 발생하면 500 응답으로 마스킹한다', async () => {
      getSourceUseCase.execute.mockRejectedValue(
        new Error('Source Repository operation failed'),
      );

      const response = await request(httpServer)
        .get('/sources/source-1')
        .expect(500);

      expect(response.body).toEqual({
        statusCode: 500,
        code: 'internal.unexpected',
        message: 'Internal server error',
        details: {},
      });
    });
  });

  describe('POST /sources', () => {
    it('source upload 요청을 use case로 전달하고 201 응답을 반환한다', async () => {
      uploadSourceUseCase.execute.mockResolvedValue({
        sourceId: 'source-1',
        externalSourceId: 'Notes/source.md',
        fingerprint: 'fingerprint-1',
        syncJobId: 'sync-job-1',
      });

      const response = await request(httpServer)
        .post('/sources')
        .send({
          externalSourceId: ' Notes/source.md ',
          content: '# Source note',
        })
        .expect(201);

      expect(response.body).toEqual({
        sourceId: 'source-1',
        externalSourceId: 'Notes/source.md',
        fingerprint: 'fingerprint-1',
        syncJobId: 'sync-job-1',
      });
      expect(uploadSourceUseCase.execute).toHaveBeenCalledWith({
        externalSourceId: 'Notes/source.md',
        content: '# Source note',
      });
    });

    it('요청 body가 유효하지 않으면 400 응답을 반환하고 use case를 호출하지 않는다', async () => {
      const response = await request(httpServer)
        .post('/sources')
        .send({
          externalSourceId: ' ',
          content: '# Source note',
        })
        .expect(400);

      expect(response.body).toEqual({
        statusCode: 400,
        code: 'request.validation_failed',
        message: 'Invalid request',
        details: {
          fields: [
            {
              path: 'externalSourceId',
              messages: ['Too small: expected string to have >=1 characters'],
            },
          ],
        },
      });
      expect(uploadSourceUseCase.execute).not.toHaveBeenCalled();
    });

    it('source upload 중 exception이 발생하면 500 응답으로 마스킹한다', async () => {
      uploadSourceUseCase.execute.mockRejectedValue(
        new Error('Source fingerprinter is unavailable'),
      );

      const response = await request(httpServer)
        .post('/sources')
        .send({
          externalSourceId: 'Notes/source.md',
          content: '# Source note',
        })
        .expect(500);

      expect(response.body).toEqual({
        statusCode: 500,
        code: 'internal.unexpected',
        message: 'Internal server error',
        details: {},
      });
    });

    it('use case가 ApplicationException NOT_FOUND를 throw하면 404 응답을 반환한다', async () => {
      uploadSourceUseCase.execute.mockRejectedValue(
        new ApplicationException({
          kind: APPLICATION_ERROR_KIND.NOT_FOUND,
          code: 'sources.source_not_found',
          message: 'Source not found',
          details: {},
        }),
      );

      const response = await request(httpServer)
        .post('/sources')
        .send({
          externalSourceId: 'Notes/source.md',
          content: '# Source note',
        })
        .expect(404);

      expect(response.body).toEqual({
        statusCode: 404,
        code: 'sources.source_not_found',
        message: 'Source not found',
        details: {},
      });
    });

    it('use case가 ApplicationException STATE_CONFLICT를 throw하면 409 응답을 반환한다', async () => {
      uploadSourceUseCase.execute.mockRejectedValue(
        new ApplicationException({
          kind: APPLICATION_ERROR_KIND.STATE_CONFLICT,
          code: 'sources.duplicate_external_source_id',
          message: 'Source already exists',
          details: {},
        }),
      );

      const response = await request(httpServer)
        .post('/sources')
        .send({
          externalSourceId: 'Notes/source.md',
          content: '# Source note',
        })
        .expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        code: 'sources.duplicate_external_source_id',
        message: 'Source already exists',
        details: {},
      });
    });
  });
});
