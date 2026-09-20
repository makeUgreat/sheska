import { z } from 'zod';
import {
  type CursorValue,
  cursorQueryParamSchema,
} from '@kernels/presentation';

export const listNotesHttpRequestSchema = z
  .object({
    cursor: cursorQueryParamSchema.optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export class ListNotesHttpRequest {
  static readonly zodSchema = listNotesHttpRequestSchema;
  readonly cursor?: CursorValue;
  readonly limit!: number;
}

export interface NoteSummaryHttpResponse {
  readonly noteId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly aliases: readonly string[];
  readonly keywords: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListNotesHttpResponse {
  readonly notes: readonly NoteSummaryHttpResponse[];
  readonly nextCursor: string | null;
}

export interface GetNoteHttpResponse extends NoteSummaryHttpResponse {
  readonly externalSourceId: string;
  readonly frontmatter: Readonly<Record<string, unknown>>;
  readonly body: string;
}
