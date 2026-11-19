import { Controller, Put, Query, Req } from '@nestjs/common';
import { type Request } from 'express';
import { type z } from 'zod';
import { ATTACHMENT_MAX_BYTES, type ApiResponse, AttachmentApi, PERMISSION } from '@sheska/contract';
import { callContext } from '@core/call-context';
import { ValidationFailedError } from '@core/errors';
import { ErrorCodes, Permission, ZodValidationPipe } from '@kernels/presentation';
import { UploadAttachmentUseCase } from '@contexts/library/application/use-cases/upload-attachment.use-case';

@Controller()
export class AttachmentsHttpController {
  constructor(private readonly uploadAttachmentUseCase: UploadAttachmentUseCase) {}

  @Put(AttachmentApi.upload.path)
  @Permission(PERMISSION.SOURCES_SYNC)
  @ErrorCodes(AttachmentApi.upload.errors)
  async upload(
    @Query(new ZodValidationPipe(AttachmentApi.upload.query))
    query: z.output<typeof AttachmentApi.upload.query>,
    @Req() request: Request,
  ): Promise<ApiResponse<typeof AttachmentApi.upload>> {
    const data = await readBody(request, ATTACHMENT_MAX_BYTES);
    const result = await this.uploadAttachmentUseCase.execute(
      { path: query.path, data },
      callContext({ deadlineMs: 60_000, maxRetries: 2 }),
    );

    return AttachmentApi.upload.response.parse(result satisfies ApiResponse<typeof AttachmentApi.upload>);
  }
}

async function readBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size <= maxBytes) chunks.push(chunk);
  }

  if (size > maxBytes) throw tooLarge(maxBytes);
  return Buffer.concat(chunks);
}

function tooLarge(maxBytes: number): ValidationFailedError {
  return new ValidationFailedError({
    code: 'attachment.too_large',
    message: `Attachment must be at most ${maxBytes} bytes`,
    details: {
      fields: [{ path: 'body', messages: [`must be at most ${maxBytes} bytes`] }],
    },
  });
}
