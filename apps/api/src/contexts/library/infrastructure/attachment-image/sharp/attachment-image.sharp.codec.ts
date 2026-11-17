import { Injectable } from '@nestjs/common';
import sharp, { type Metadata } from 'sharp';
import { InvalidDataError } from '@core/errors';
import type {
  AttachmentImageCodec,
  AttachmentImageInfo,
  AttachmentImageMediaType,
} from '@contexts/library/application/ports';

@Injectable()
export class AttachmentImageSharpCodec implements AttachmentImageCodec {
  async inspect(data: Uint8Array): Promise<AttachmentImageInfo> {
    let metadata: Metadata;
    try {
      metadata = await sharp(data).metadata();
    } catch (error: unknown) {
      throw new InvalidDataError({
        code: 'sharp.unreadable_image',
        message: 'Content cannot be read as an image',
        details: { fields: ['data'] },
        cause: error,
      });
    }

    const mediaType = toMediaType(metadata);
    if (!mediaType) {
      throw new InvalidDataError({
        code: 'sharp.unsupported_format',
        message: `${metadata.format} is not a supported image format`,
        details: { fields: ['data'] },
      });
    }

    return {
      mediaType,
      frameWidth: metadata.width,
      frameHeight: metadata.pageHeight ?? metadata.height,
      frameCount: metadata.pages ?? 1,
    };
  }

  async encodeWebp(
    data: Uint8Array,
    { maxWidth, quality }: { maxWidth: number; quality: number },
  ): Promise<Uint8Array> {
    try {
      return await sharp(data, { animated: true })
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
    } catch (error: unknown) {
      throw new InvalidDataError({
        code: 'sharp.undecodable_image',
        message: 'Image content cannot be decoded',
        details: { fields: ['data'] },
        cause: error,
      });
    }
  }
}

function toMediaType({
  format,
  compression,
}: Metadata): AttachmentImageMediaType | null {
  switch (format) {
    case 'png':
      return 'image/png';
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'heif':
      return compression === 'av1' ? 'image/avif' : null;
    default:
      return null;
  }
}
