import * as z from 'zod';
import { defineApi } from '../api.js';
import { CommonErrorCode } from '../error.js';
import {
  SourceSyncJobErrorCode,
  SourceSyncJobSchema,
} from './source-sync-job.js';

const embeddingSchema = z.object({
  model: z.string(),
  dimensions: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const summarySchema = z.object({
  sourceId: z.string(),
  /** vault 안의 파일 경로. */
  externalSourceId: z.string(),
  title: z.string(),
  fingerprint: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  /** sync job이 하나도 없으면 `null`이다. */
  latestSyncJob: SourceSyncJobSchema.summary.nullable(),
  /** 발행하지 않았으면 `null`이다. */
  publishedPostId: z.string().nullable(),
});

const sourceSchema = summarySchema.extend({
  frontmatter: z.record(z.string(), z.unknown()),
  /** frontmatter를 뺀 본문. */
  body: z.string(),
  /** 임베딩이 아직 없으면 `null`이다. */
  embedding: embeddingSchema.nullable(),
});

export const SourceSchema = {
  embedding: embeddingSchema,
  summary: summarySchema,
  source: sourceSchema,
};

export type SourceSummaryResponse = z.infer<typeof summarySchema>;
export type SourceResponse = z.infer<typeof sourceSchema>;
export type SourceEmbeddingResponse = z.infer<typeof embeddingSchema>;

export const SourceErrorCode = {
  /** 경로의 식별자로 된 source가 없다. */
  NOT_FOUND: 'source.not_found',
  /** 파일의 frontmatter `sheska`가 YAML boolean `true`가 아니다. */
  NOT_SYNC_TARGET: 'source.not_sync_target',
  /** frontmatter 형식이 틀렸다. `details.fields`에 이유를 담는다. */
  INVALID_FRONTMATTER: 'source.invalid_frontmatter',
  /**
   * 같은 경로의 새 파일을 다른 요청이 같은 순간에 먼저 받았다.
   * 다시 보내면 먼저 받은 source를 갱신한다.
   */
  EXTERNAL_SOURCE_ID_ALREADY_EXISTS: 'source.external_source_id_already_exists',
} as const;

export const SourceApi = {
  list: defineApi({
    method: 'GET',
    path: '/sources',
    query: z.strictObject({
      page: z.coerce.number<number>().int().positive().default(1),
      pageSize: z.coerce.number<number>().int().positive().max(100).default(10),
      /** 가장 최근 sync job의 상태로 거른다. */
      syncJobStatus: SourceSyncJobSchema.storedStatus.optional(),
    }),
    response: z.object({
      sources: z.array(summarySchema),
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      totalCount: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    }),
    errors: [CommonErrorCode.VALIDATION_FAILED],
  }),

  get: defineApi({
    method: 'GET',
    path: '/sources/:id',
    response: sourceSchema,
    errors: [SourceErrorCode.NOT_FOUND],
  }),

  /**
   * vault 파일 하나를 보낸다. 없으면 만들고, 내용이 다르면 갱신한다.
   * 같은 파일을 여러 번 보내도 한 번 보낸 것과 결과가 같다.
   */
  upload: defineApi({
    method: 'POST',
    path: '/sources',
    request: z.strictObject({
      /** vault 안의 파일 경로. 앞뒤 공백은 서버가 지운다. */
      externalSourceId: z.string().trim().min(1),
      /** frontmatter를 포함한 파일 내용 전체. */
      content: z.string(),
    }),
    response: z.object({
      sourceId: z.string(),
      externalSourceId: z.string(),
      fingerprint: z.string(),
      /** 이 업로드 때문에 기다려야 할 임베딩이 있을 때만 있다. */
      syncJobId: z.string().optional(),
    }),
    errors: [
      CommonErrorCode.VALIDATION_FAILED,
      SourceErrorCode.NOT_SYNC_TARGET,
      SourceErrorCode.INVALID_FRONTMATTER,
      SourceErrorCode.EXTERNAL_SOURCE_ID_ALREADY_EXISTS,
      SourceSyncJobErrorCode.ALREADY_ACTIVE,
    ],
  }),
};
