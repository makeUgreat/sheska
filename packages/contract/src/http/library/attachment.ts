import * as z from 'zod';
import { defineApi } from '../api.js';
import { CommonErrorCode } from '../error.js';

export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

const MAX_PATH_BYTES = 1000;

function isPathInsideVault(path: string): boolean {
  if (path.includes('\\')) return false;
  if (new TextEncoder().encode(path).length > MAX_PATH_BYTES) return false;
  return path
    .split('/')
    .every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

export const AttachmentErrorCode = {
  /** 파일 내용이 지원하는 이미지 형식이 아니다. 확장자는 보지 않는다. */
  UNSUPPORTED_MEDIA_TYPE: 'attachment.unsupported_media_type',
  /** 본문이 `ATTACHMENT_MAX_BYTES`를 넘는다. */
  TOO_LARGE: 'attachment.too_large',
  /** 모든 frame을 합친 픽셀 수가 서버 상한을 넘는다. */
  TOO_MANY_PIXELS: 'attachment.too_many_pixels',
  /** 이미지 형식이지만 내용을 디코딩할 수 없다. */
  CORRUPT_IMAGE: 'attachment.corrupt_image',
} as const;

export const AttachmentApi = {
  /**
   * vault의 이미지 파일 하나를 올린다. 같은 경로에 이미 있으면 덮어쓴다.
   * 서버는 래스터 이미지를 줄이고 WebP로 바꿔 저장할 수 있다.
   */
  upload: defineApi({
    method: 'PUT',
    path: '/attachments',
    query: z.strictObject({
      /** vault 안의 상대 경로. 예: `attachments/a.png` */
      path: z.string().refine(isPathInsideVault, {
        message: 'must be a relative path inside the vault',
      }),
    }),
    binaryRequest: true,
    response: z.object({
      path: z.string(),
      /** 저장한 내용의 형식. 바꿔 저장했으면 원본과 다르다. 예: `image/webp` */
      mediaType: z.string(),
      sizeBytes: z.number().int().nonnegative(),
      originalSizeBytes: z.number().int().nonnegative(),
    }),
    errors: [
      CommonErrorCode.VALIDATION_FAILED,
      AttachmentErrorCode.UNSUPPORTED_MEDIA_TYPE,
      AttachmentErrorCode.TOO_LARGE,
      AttachmentErrorCode.TOO_MANY_PIXELS,
      AttachmentErrorCode.CORRUPT_IMAGE,
    ],
  }),
};
