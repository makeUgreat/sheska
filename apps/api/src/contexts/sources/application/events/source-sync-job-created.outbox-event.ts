import { type OutboxEvent } from '@kernels/application';

export const SOURCE_SYNC_JOB_CREATED_EVENT_TYPE =
  'source.sync_job.created' as const;
export const SOURCE_SYNC_JOB_CREATED_EVENT_VERSION = 1 as const;

export type SourceSyncJobCreatedOutboxEvent = OutboxEvent<
  typeof SOURCE_SYNC_JOB_CREATED_EVENT_TYPE,
  typeof SOURCE_SYNC_JOB_CREATED_EVENT_VERSION,
  {
    readonly sourceId: string;
    readonly syncJobId: string;
    readonly content: string;
  }
>;
