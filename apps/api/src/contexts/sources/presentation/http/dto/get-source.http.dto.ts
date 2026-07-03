import { type GetSourceResult } from '@contexts/sources/application/use-cases/get-source.use-case';

export interface GetSourceHttpResponse {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly content: string;
  readonly fingerprint: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toGetSourceHttpResponse(
  result: GetSourceResult,
): GetSourceHttpResponse {
  return {
    sourceId: result.sourceId,
    externalSourceId: result.externalSourceId,
    content: result.content,
    fingerprint: result.fingerprint,
    sizeBytes: result.sizeBytes,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  };
}
