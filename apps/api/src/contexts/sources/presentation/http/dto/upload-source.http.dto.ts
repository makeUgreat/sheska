import { z, type ZodIssue } from 'zod';
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

export type UploadSourceHttpRequest = z.infer<
  typeof uploadSourceHttpRequestSchema
>;

export class UploadSourceHttpRequestDto {
  static readonly zodSchema = uploadSourceHttpRequestSchema;
  static readonly zodErrorCode = 'sources.upload.validation_failed';
  static readonly zodErrorMessage = 'Invalid upload source request';
  static readonly zodMessageForIssue = messageForUploadSourceHttpRequestIssue;

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

export function messageForUploadSourceHttpRequestIssue(
  issue: ZodIssue,
  path: string,
): string {
  if (path === 'externalSourceId') {
    return issue.code === 'invalid_type'
      ? 'externalSourceId must be a string'
      : 'externalSourceId cannot be empty';
  }

  if (path === 'content') {
    return 'content must be a string';
  }

  if (issue.code === 'unrecognized_keys') {
    return 'Request contains unknown fields';
  }

  return 'Request body is invalid';
}
