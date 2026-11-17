export type AttachmentImageMediaType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/webp'
  | 'image/avif'
  | 'image/svg+xml';

export interface AttachmentImageInfo {
  readonly mediaType: AttachmentImageMediaType;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
}

export interface AttachmentImageCodec {
  inspect(data: Uint8Array): Promise<AttachmentImageInfo>;
  encodeWebp(
    data: Uint8Array,
    options: { maxWidth: number; quality: number },
  ): Promise<Uint8Array>;
}
