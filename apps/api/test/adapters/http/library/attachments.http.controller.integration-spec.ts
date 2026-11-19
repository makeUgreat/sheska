import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ValidationFailedError } from '@core/errors';
import { UploadAttachmentUseCase } from '@contexts/library/application/use-cases/upload-attachment.use-case';
import { AttachmentsHttpController } from '@contexts/library/presentation/http/attachments.http.controller';
import { HttpExceptionFilter } from '@platform/nest/filters/http-exception.filter';
import { DeclaredErrorCodesInterceptor } from '@platform/nest/interceptors/declared-error-codes.interceptor';
import { LOGGER } from '@kernels/application';
import { ATTACHMENT_MAX_BYTES, AttachmentApi, errorResponseSchema } from '@sheska/contract';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';

type UploadAttachmentUseCaseMock = {
  execute: MockedFunction<UploadAttachmentUseCase['execute']>;
};

const IMAGE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

describe('AttachmentsHttpController', () => {
  let app: INestApplication;
  let httpServer: Server;
  let uploadAttachmentUseCase: UploadAttachmentUseCaseMock;

  beforeEach(async () => {
    uploadAttachmentUseCase = {
      execute: vi.fn<UploadAttachmentUseCase['execute']>(),
    };

    const testingModule = await Test.createTestingModule({
      controllers: [AttachmentsHttpController],
      providers: [
        { provide: UploadAttachmentUseCase, useValue: uploadAttachmentUseCase },
        { provide: APP_INTERCEPTOR, useClass: DeclaredErrorCodesInterceptor },
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

  afterEach(async () => {
    await app.close();
  });

  function upload(path: string | undefined, body: Buffer = IMAGE) {
    const req = request(httpServer).put('/attachments');
    return (path === undefined ? req : req.query({ path })).set('Content-Type', 'application/octet-stream').send(body);
  }

  describe('PUT /attachments', () => {
    it('본문 바이트를 그대로 use case에 넘기고 저장 결과를 200으로 돌려준다', async () => {
      uploadAttachmentUseCase.execute.mockResolvedValue({
        path: 'att/my img.png',
        mediaType: 'image/webp',
        sizeBytes: 3,
        originalSizeBytes: IMAGE.length,
      });

      const response = await upload('att/my img.png').expect(200);

      expect(AttachmentApi.upload.response.parse(response.body)).toEqual({
        path: 'att/my img.png',
        mediaType: 'image/webp',
        sizeBytes: 3,
        originalSizeBytes: IMAGE.length,
      });
      const [command] = uploadAttachmentUseCase.execute.mock.calls[0] ?? [];
      expect(command?.path).toBe('att/my img.png');
      expect(Buffer.from(command?.data ?? [])).toEqual(IMAGE);
    });

    it.each([
      ['없으면', undefined],
      ['앞에 /가 있으면', '/att/a.png'],
      ['.. segment가 있으면', 'att/../a.png'],
    ])('path가 %s 400 request.validation_failed를 돌려준다', async (_, path) => {
      const response = await upload(path).expect(400);

      expect(errorResponseSchema.parse(response.body).code).toBe('request.validation_failed');
      expect(uploadAttachmentUseCase.execute).not.toHaveBeenCalled();
    });

    it('본문이 상한을 넘으면 use case를 부르지 않고 400 attachment.too_large를 돌려준다', async () => {
      const response = await upload('att/a.png', Buffer.alloc(ATTACHMENT_MAX_BYTES + 1)).expect(400);

      expect(errorResponseSchema.parse(response.body).code).toBe('attachment.too_large');
      expect(uploadAttachmentUseCase.execute).not.toHaveBeenCalled();
    });

    it('use case가 형식을 거부하면 400과 그 code를 돌려준다', async () => {
      uploadAttachmentUseCase.execute.mockRejectedValue(
        new ValidationFailedError({
          code: 'attachment.unsupported_media_type',
          message: 'Attachment is not a supported image',
          details: {
            fields: [{ path: 'body', messages: ['tiff is not supported'] }],
          },
        }),
      );

      const response = await upload('att/a.tiff').expect(400);

      expect(errorResponseSchema.parse(response.body)).toMatchObject({
        code: 'attachment.unsupported_media_type',
        details: {
          fields: [{ path: 'body', messages: ['tiff is not supported'] }],
        },
      });
    });
  });
});
