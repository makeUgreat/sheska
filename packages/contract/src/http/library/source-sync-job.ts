import * as z from 'zod';
import { defineApi } from '../api.js';

/** 저장된 sync job 상태. 대기(`waiting`), 완료(`completed`), 실패(`failed`) 중 하나다. */
const storedStatusSchema = z.enum(['waiting', 'completed', 'failed']);

/** 대기 중인 sync job의 임베딩이 진행 중이면 `processing`이다. 저장 상태가 아니라 조회할 때 정한다. */
const statusSchema = z.enum(['waiting', 'processing', 'completed', 'failed']);

const summarySchema = z.object({
  syncJobId: z.string(),
  status: storedStatusSchema,
  /** 청크로 나누기 전이면 `null`이다. */
  totalChunks: z.number().int().nullable(),
  createdAt: z.iso.datetime(),
});

const syncJobSchema = z.object({
  syncJobId: z.string(),
  sourceId: z.string(),
  fingerprint: z.string(),
  status: statusSchema,
  /** 청크로 나누기 전이면 `null`이다. */
  totalChunks: z.number().int().nullable(),
  /** 임베딩이 진행 중일 때만 값이 있다. */
  processedChunks: z.number().int().nullable(),
  createdAt: z.iso.datetime(),
});

export const SourceSyncJobSchema = {
  storedStatus: storedStatusSchema,
  status: statusSchema,
  summary: summarySchema,
  syncJob: syncJobSchema,
};

export type SourceSyncJobStoredStatus = z.infer<typeof storedStatusSchema>;
export type SourceSyncJobStatus = z.infer<typeof statusSchema>;
export type SourceSyncJobSummaryResponse = z.infer<typeof summarySchema>;
export type SourceSyncJobResponse = z.infer<typeof syncJobSchema>;

export const SourceSyncJobErrorCode = {
  /** 경로의 식별자로 된 sync job이 없다. */
  NOT_FOUND: 'source_sync_job.not_found',
  /**
   * 같은 내용의 업로드를 다른 요청이 같은 순간에 받아 대기 중인 sync job을 먼저 만들었다.
   * 다시 보내면 그 sync job을 돌려받는다.
   */
  ALREADY_ACTIVE: 'source_sync_job.already_active',
} as const;

export const SourceSyncJobApi = {
  get: defineApi({
    method: 'GET',
    path: '/sync-jobs/:id',
    response: syncJobSchema,
    errors: [SourceSyncJobErrorCode.NOT_FOUND],
  }),
};
