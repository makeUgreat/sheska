import { z } from 'zod';
import { type UploadSourceResult } from '@contexts/sources/application/use-cases/upload-source.use-case';

export const uploadSourceHttpRequestSchema = z
  .object({
    externalSourceId: z
      .string()
      .transform((value) => value.trim())
      .pipe(z.string().min(1)),
    content: z.string(),
  })
  .strict();

export class UploadSourceHttpRequest {
  static readonly zodSchema = uploadSourceHttpRequestSchema;

  readonly externalSourceId!: string;
  readonly content!: string;
}

export interface UploadSourceHttpResponse {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly fingerprint: string;
  readonly syncJobId?: string;
}

export function toUploadSourceHttpResponse(
  result: UploadSourceResult,
): UploadSourceHttpResponse {
  return {
    sourceId: result.sourceId,
    externalSourceId: result.externalSourceId,
    fingerprint: result.fingerprint,
    syncJobId: result.syncJobId,
  };
}
