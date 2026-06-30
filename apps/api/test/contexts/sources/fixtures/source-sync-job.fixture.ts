import { SourceSyncJob } from '@contexts/sources/domain';

export function buildSourceSyncJob(
  params: Partial<Parameters<typeof SourceSyncJob.create>[0]> = {},
): SourceSyncJob {
  return SourceSyncJob.create({
    sourceId: params.sourceId ?? 'source-1',
    fingerprint: params.fingerprint ?? 'fingerprint-1',
  });
}
