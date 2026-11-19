import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { InvalidDataError } from '@core/errors';
import { AttachmentImageSharpCodec } from '@contexts/library/infrastructure/attachment-image/sharp/attachment-image.sharp.codec';

function buildNoise(width: number, height: number): sharp.Sharp {
  const pixels = Buffer.alloc(width * height * 3);
  for (let index = 0; index < pixels.length; index += 1) {
    pixels[index] = (index * 7919 + Math.floor(index / width) * 104729) % 256;
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } });
}

async function buildAnimatedGif(width: number, height: number, frameCount: number) {
  const frames = await Promise.all(
    Array.from({ length: frameCount }, (_, index) =>
      buildNoise(width, height)
        .modulate({ hue: index * 90 })
        .png()
        .toBuffer(),
    ),
  );
  return sharp(frames, { join: { animated: true } })
    .gif()
    .toBuffer();
}

const XMP = '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"/></x:xmpmeta>';

const ENCODE_OPTIONS = { maxWidth: 1360, quality: 80 };

describe('AttachmentImageSharpCodec (integration)', () => {
  let codec: AttachmentImageSharpCodec;

  beforeAll(() => {
    codec = new AttachmentImageSharpCodec();
  });

  describe('inspect', () => {
    it.each([
      ['image/png', () => buildNoise(30, 20).png().toBuffer()],
      ['image/jpeg', () => buildNoise(30, 20).jpeg().toBuffer()],
      ['image/gif', () => buildNoise(30, 20).gif().toBuffer()],
      ['image/webp', () => buildNoise(30, 20).webp().toBuffer()],
      ['image/avif', () => buildNoise(30, 20).avif({ effort: 0 }).toBuffer()],
    ])('내용으로 %s와 크기를 판정한다', async (mediaType, build) => {
      expect(await codec.inspect(await build())).toEqual({
        mediaType,
        frameWidth: 30,
        frameHeight: 20,
        frameCount: 1,
      });
    });

    it('SVG를 image/svg+xml로 판정한다', async () => {
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="20"/>');

      expect(await codec.inspect(svg)).toMatchObject({
        mediaType: 'image/svg+xml',
      });
    });

    it('이미지라도 다루는 형식이 아니면 InvalidDataError를 던진다', async () => {
      const tiff = await buildNoise(30, 20).tiff().toBuffer();

      await expect(codec.inspect(tiff)).rejects.toBeInstanceOf(InvalidDataError);
    });

    it('애니메이션은 frame 하나의 크기와 frame 수를 돌려준다', async () => {
      const gif = await buildAnimatedGif(40, 20, 3);

      expect(await codec.inspect(gif)).toEqual({
        mediaType: 'image/gif',
        frameWidth: 40,
        frameHeight: 20,
        frameCount: 3,
      });
    });

    it('이미지로 읽을 수 없으면 InvalidDataError를 던진다', async () => {
      await expect(codec.inspect(Buffer.from('%PDF-1.7 not an image'))).rejects.toBeInstanceOf(InvalidDataError);
    });
  });

  describe('encodeWebp', () => {
    it('폭이 maxWidth보다 크면 비율을 지켜 줄이고 WebP로 인코딩한다', async () => {
      const jpeg = await buildNoise(3000, 2000).jpeg().toBuffer();

      const encoded = await codec.encodeWebp(jpeg, ENCODE_OPTIONS);

      expect(await sharp(encoded).metadata()).toMatchObject({
        format: 'webp',
        width: 1360,
        height: 907,
      });
    });

    it('폭이 maxWidth 이하이면 키우지 않는다', async () => {
      const png = await buildNoise(300, 200).png().toBuffer();

      const encoded = await codec.encodeWebp(png, ENCODE_OPTIONS);

      expect(await sharp(encoded).metadata()).toMatchObject({
        width: 300,
        height: 200,
      });
    });

    it('EXIF 방향대로 회전한다', async () => {
      const jpeg = await buildNoise(300, 100).jpeg().withMetadata({ orientation: 6 }).toBuffer();

      const encoded = await codec.encodeWebp(jpeg, ENCODE_OPTIONS);

      expect(await sharp(encoded).metadata()).toMatchObject({
        width: 100,
        height: 300,
      });
    });

    it('GPS가 든 EXIF, ICC, XMP를 남기지 않는다', async () => {
      const jpeg = await buildNoise(300, 100)
        .jpeg()
        .withExif({
          IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '37/1 33/1 0/1' },
        })
        .withIccProfile('p3')
        .withXmp(XMP)
        .toBuffer();
      const input = await sharp(jpeg).metadata();
      expect(input.exif).toBeDefined();
      expect(input.icc).toBeDefined();
      expect(input.xmp).toBeDefined();

      const metadata = await sharp(await codec.encodeWebp(jpeg, ENCODE_OPTIONS)).metadata();

      expect(metadata.exif).toBeUndefined();
      expect(metadata.icc).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
    });

    it('애니메이션은 모든 frame을 유지한 채 줄여서 애니메이션 WebP로 인코딩한다', async () => {
      const gif = await buildAnimatedGif(2000, 100, 3);

      const metadata = await sharp(await codec.encodeWebp(gif, ENCODE_OPTIONS)).metadata();

      expect(metadata).toMatchObject({
        format: 'webp',
        width: 1360,
        height: 68,
        pages: 3,
      });
    });

    it('헤더는 맞지만 내용이 잘렸으면 InvalidDataError를 던진다', async () => {
      const jpeg = await buildNoise(300, 200).jpeg().toBuffer();

      await expect(codec.encodeWebp(jpeg.subarray(0, Math.floor(jpeg.length / 2)), ENCODE_OPTIONS)).rejects.toBeInstanceOf(
        InvalidDataError,
      );
    });
  });
});
