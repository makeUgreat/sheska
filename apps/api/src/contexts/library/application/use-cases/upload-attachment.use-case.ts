import { Inject, Injectable } from '@nestjs/common';
import { type CallContext } from '@core/call-context';
import { type AttachmentContentStore } from '@contexts/library/application/ports';
import {
  AttachmentImageOptimizer,
  type OptimizedAttachmentImage,
} from '@contexts/library/application/services/attachment-image-optimizer.service';
import { ATTACHMENT_CONTENT_STORE } from '@contexts/library/library.di-tokens';

export interface UploadAttachmentCommand {
  readonly path: string;
  readonly data: Uint8Array;
}

export interface UploadAttachmentImageOptimizer {
  optimize(data: Uint8Array): Promise<OptimizedAttachmentImage>;
}

export interface UploadAttachmentResult {
  readonly path: string;
  readonly mediaType: string;
  readonly sizeBytes: number;
  readonly originalSizeBytes: number;
}

@Injectable()
export class UploadAttachmentUseCase {
  constructor(
    @Inject(AttachmentImageOptimizer)
    private readonly optimizer: UploadAttachmentImageOptimizer,
    @Inject(ATTACHMENT_CONTENT_STORE)
    private readonly store: AttachmentContentStore,
  ) {}

  async execute(
    { path, data }: UploadAttachmentCommand,
    context: CallContext,
  ): Promise<UploadAttachmentResult> {
    const optimized = await this.optimizer.optimize(data);
    await this.store.put(path, optimized.data, optimized.mediaType, context);

    return {
      path,
      mediaType: optimized.mediaType,
      sizeBytes: optimized.data.length,
      originalSizeBytes: data.length,
    };
  }
}
