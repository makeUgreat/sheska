import { z } from 'zod';

export const listSourcesHttpRequestSchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
  })
  .strict();

export class ListSourcesHttpRequest {
  static readonly zodSchema = listSourcesHttpRequestSchema;

  readonly page?: number;
  readonly limit?: number;
}

export interface SourceSummaryHttpResponse {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly fingerprint: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListSourcesHttpResponse {
  readonly sources: SourceSummaryHttpResponse[];
}
