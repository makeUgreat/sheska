import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { UploadSourceUseCase } from '@contexts/sources/application/use-cases/upload-source.use-case';
import {
  ApplicationException,
  APPLICATION_ERROR_KIND,
} from '@kernels/application';
import { SourcesHttpController } from '@contexts/sources/presentation/http/sources-http.controller';
import { HttpExceptionFilter } from '@platform/nest/filters/http-exception.filter';
import { ZodValidationPipe } from '@platform/nest/pipes/zod-validation.pipe';
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

describe('SourcesHttpController', () => {
  let app: INestApplication;
  let httpServer: Server;
  let uploadSourceUseCase: UploadSourceUseCaseMock;

  beforeEach(async () => {
    uploadSourceUseCase = {
      execute: vi.fn<UploadSourceUseCase['execute']>(),
    };

    const testingModule = await Test.createTestingModule({
      controllers: [SourcesHttpController],
      providers: [
        {
          provide: UploadSourceUseCase,
          useValue: uploadSourceUseCase,
        },
        {
          provide: APP_PIPE,
          useClass: ZodValidationPipe,
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
        code: 'sources.upload.validation_failed',
        message: 'Invalid upload source request',
        details: {
          fields: [
            {
              path: 'externalSourceId',
              messages: ['externalSourceId cannot be empty'],
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
