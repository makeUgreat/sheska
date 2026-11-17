import { InvalidDataError, UnavailableError } from '@core/errors';
import {
  type AttachmentImageCodec,
  type AttachmentImageInfo,
  type AttachmentImageMediaType,
} from '@contexts/library/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { AttachmentImageOptimizer } from '../attachment-image-optimizer.service';

type CodecMock = {
  inspect: MockedFunction<AttachmentImageCodec['inspect']>;
  encodeWebp: MockedFunction<AttachmentImageCodec['encodeWebp']>;
};

const ORIGINAL = new Uint8Array(100);
const SMALLER = new Uint8Array(10);
const LARGER = new Uint8Array(200);

function invalidData(): InvalidDataError {
  return new InvalidDataError({
    code: 'codec.invalid',
    message: 'invalid',
    details: { fields: ['data'] },
  });
}

function setup(info: Partial<AttachmentImageInfo> = {}) {
  const codec: CodecMock = {
    inspect: vi.fn<AttachmentImageCodec['inspect']>().mockResolvedValue({
      mediaType: 'image/jpeg',
      frameWidth: 3000,
      frameHeight: 2000,
      frameCount: 1,
      ...info,
    }),
    encodeWebp: vi
      .fn<AttachmentImageCodec['encodeWebp']>()
      .mockResolvedValue(SMALLER),
  };
  return { codec, optimizer: new AttachmentImageOptimizer(codec) };
}

describe('AttachmentImageOptimizer', () => {
  describe('지원하는 형식', () => {
    it.each<AttachmentImageMediaType>([
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/avif',
    ])('%s는 폭 1360px, 품질 80의 WebP로 바꾼다', async (mediaType) => {
      const { codec, optimizer } = setup({ mediaType });

      const result = await optimizer.optimize(ORIGINAL);

      expect(codec.encodeWebp).toHaveBeenCalledWith(ORIGINAL, {
        maxWidth: 1360,
        quality: 80,
      });
      expect(result).toEqual({ data: SMALLER, mediaType: 'image/webp' });
    });

    it('애니메이션 GIF도 WebP로 바꾼다', async () => {
      const { codec, optimizer } = setup({
        mediaType: 'image/gif',
        frameWidth: 400,
        frameHeight: 300,
        frameCount: 24,
      });

      const result = await optimizer.optimize(ORIGINAL);

      expect(codec.encodeWebp).toHaveBeenCalledOnce();
      expect(result).toEqual({ data: SMALLER, mediaType: 'image/webp' });
    });

    it('SVG는 벡터라서 바꾸지 않고 그대로 돌려준다', async () => {
      const { codec, optimizer } = setup({ mediaType: 'image/svg+xml' });

      const result = await optimizer.optimize(ORIGINAL);

      expect(codec.encodeWebp).not.toHaveBeenCalled();
      expect(result).toEqual({ data: ORIGINAL, mediaType: 'image/svg+xml' });
    });

    it('WebP로 바꾼 결과가 원본보다 크면 원본을 돌려준다', async () => {
      const { codec, optimizer } = setup({ mediaType: 'image/png' });
      codec.encodeWebp.mockResolvedValue(LARGER);

      const result = await optimizer.optimize(ORIGINAL);

      expect(result).toEqual({ data: ORIGINAL, mediaType: 'image/png' });
    });
  });

  describe('거부', () => {
    it('지원 형식의 이미지로 읽을 수 없으면 attachment.unsupported_media_type으로 거부한다', async () => {
      const { codec, optimizer } = setup();
      codec.inspect.mockRejectedValue(invalidData());

      await expect(optimizer.optimize(ORIGINAL)).rejects.toMatchObject({
        code: 'attachment.unsupported_media_type',
        details: { fields: [{ path: 'body', messages: ['invalid'] }] },
      });
    });

    it('모든 frame의 픽셀이 40,000,000개를 넘으면 인코딩하지 않고 거부한다', async () => {
      const { codec, optimizer } = setup({
        frameWidth: 2000,
        frameHeight: 2000,
        frameCount: 11,
      });

      await expect(optimizer.optimize(ORIGINAL)).rejects.toMatchObject({
        code: 'attachment.too_many_pixels',
      });
      expect(codec.encodeWebp).not.toHaveBeenCalled();
    });

    it('모든 frame의 픽셀이 정확히 40,000,000개이면 받는다', async () => {
      const { optimizer } = setup({
        frameWidth: 2000,
        frameHeight: 2000,
        frameCount: 10,
      });

      await expect(optimizer.optimize(ORIGINAL)).resolves.toMatchObject({
        mediaType: 'image/webp',
      });
    });

    it('디코딩에 실패하면 attachment.corrupt_image로 거부한다', async () => {
      const { codec, optimizer } = setup();
      codec.encodeWebp.mockRejectedValue(invalidData());

      await expect(optimizer.optimize(ORIGINAL)).rejects.toMatchObject({
        code: 'attachment.corrupt_image',
        details: { fields: [{ path: 'body', messages: ['invalid'] }] },
      });
    });

    it('데이터 문제가 아닌 실패는 바꾸지 않고 전파한다', async () => {
      const { codec, optimizer } = setup();
      const failure = new UnavailableError({
        code: 'codec.unavailable',
        message: 'unavailable',
        details: {},
      });
      codec.encodeWebp.mockRejectedValue(failure);

      await expect(optimizer.optimize(ORIGINAL)).rejects.toBe(failure);
    });
  });
});
