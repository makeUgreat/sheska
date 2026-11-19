import { Inject, Injectable } from '@nestjs/common';
import { InvalidDataError, ValidationFailedError } from '@core/errors';
import { type AttachmentImageCodec, type AttachmentImageInfo, type AttachmentImageMediaType } from '@contexts/library/application/ports';
import { ATTACHMENT_IMAGE_CODEC } from '@contexts/library/library.di-tokens';

const MAX_WIDTH = 1360;
const WEBP_QUALITY = 80;
const MAX_PIXELS = 40_000_000;

const ENCODABLE_MEDIA_TYPES: readonly AttachmentImageMediaType[] = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'];

export interface OptimizedAttachmentImage {
  readonly data: Uint8Array;
  readonly mediaType: AttachmentImageMediaType;
}

@Injectable()
export class AttachmentImageOptimizer {
  constructor(
    @Inject(ATTACHMENT_IMAGE_CODEC)
    private readonly codec: AttachmentImageCodec,
  ) {}

  async optimize(data: Uint8Array): Promise<OptimizedAttachmentImage> {
    const image = await this.inspect(data);
    const original = { data, mediaType: image.mediaType };
    if (!ENCODABLE_MEDIA_TYPES.includes(image.mediaType)) return original;

    const pixels = image.frameWidth * image.frameHeight * image.frameCount;
    if (pixels > MAX_PIXELS) throw tooManyPixels(pixels);

    const encoded = await this.encodeWebp(data);
    return this.pickSmaller(original, encoded);
  }

  private pickSmaller(original: OptimizedAttachmentImage, encoded: OptimizedAttachmentImage): OptimizedAttachmentImage {
    return encoded.data.length < original.data.length ? encoded : original;
  }

  private async inspect(data: Uint8Array): Promise<AttachmentImageInfo> {
    try {
      return await this.codec.inspect(data);
    } catch (error: unknown) {
      if (!(error instanceof InvalidDataError)) throw error;
      throw new ValidationFailedError({
        code: 'attachment.unsupported_media_type',
        message: 'Attachment is not a supported image',
        details: { fields: [{ path: 'body', messages: [error.message] }] },
        cause: error,
      });
    }
  }

  private async encodeWebp(data: Uint8Array): Promise<OptimizedAttachmentImage> {
    try {
      const encoded = await this.codec.encodeWebp(data, {
        maxWidth: MAX_WIDTH,
        quality: WEBP_QUALITY,
      });
      return { data: encoded, mediaType: 'image/webp' };
    } catch (error: unknown) {
      if (!(error instanceof InvalidDataError)) throw error;
      throw new ValidationFailedError({
        code: 'attachment.corrupt_image',
        message: 'Image content cannot be decoded',
        details: { fields: [{ path: 'body', messages: [error.message] }] },
        cause: error,
      });
    }
  }
}

function tooManyPixels(pixels: number): ValidationFailedError {
  return new ValidationFailedError({
    code: 'attachment.too_many_pixels',
    message: `Image must have at most ${MAX_PIXELS} pixels across all frames`,
    details: {
      fields: [
        {
          path: 'body',
          messages: [`has ${pixels} pixels, at most ${MAX_PIXELS}`],
        },
      ],
    },
  });
}
