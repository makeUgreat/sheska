import { z } from 'zod';

export const uploadSourceHttpRequestSchema = z
  .object({
    externalSourceId: z
      .string()
      .transform((value) => value.trim())
      .pipe(z.string().min(1)),
    content: z.string(),
    links: z.array(
      z
        .object({
          target: z.string().trim().min(1),
          resolvedPath: z.string().min(1).nullable(),
        })
        .strict(),
    ),
  })
  .strict();

export class UploadSourceHttpRequest {
  static readonly zodSchema = uploadSourceHttpRequestSchema;

  readonly externalSourceId!: string;
  readonly content!: string;
  readonly links!: ReadonlyArray<{
    readonly target: string;
    readonly resolvedPath: string | null;
  }>;
}

export interface UploadSourceHttpResponse {
  readonly sourceId: string;
  readonly externalSourceId: string;
  readonly fingerprint: string;
  readonly syncJobId?: string;
}
