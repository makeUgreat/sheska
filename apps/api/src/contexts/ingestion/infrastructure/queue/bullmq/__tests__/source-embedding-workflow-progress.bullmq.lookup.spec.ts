import { describe, expect, it, vi } from 'vitest';
import { type Job, type Queue } from 'bullmq';
import { type FinalizeEmbeddingWorkflowCommand } from '@contexts/ingestion/application/use-cases/finalize-embedding-workflow.use-case';
import { SourceEmbeddingWorkflowProgressBullMqLookup } from '../source-embedding-workflow-progress.bullmq.lookup';

describe('SourceEmbeddingWorkflowProgressBullMqLookup', () => {
  it('완료된 dependency 수를 처리된 chunk 수로 반환한다', async () => {
    const parent = {
      data: { totalChunks: 4 },
      getDependenciesCount: vi.fn().mockResolvedValue({ processed: 3 }),
    } as unknown as Job;
    const finalizeQueue = {
      getJob: vi.fn().mockResolvedValue(parent),
    } as unknown as Queue<FinalizeEmbeddingWorkflowCommand>;
    const lookup = new SourceEmbeddingWorkflowProgressBullMqLookup(
      finalizeQueue,
    );

    await expect(lookup.find({ syncJobId: 'sync-job-1' })).resolves.toEqual({
      totalChunks: 4,
      processedChunks: 3,
    });
  });

  it('처리된 dependency 수를 totalChunks 이하로 제한한다', async () => {
    const parent = {
      data: { totalChunks: 4 },
      getDependenciesCount: vi.fn().mockResolvedValue({ processed: 5 }),
    } as unknown as Job;
    const lookup = new SourceEmbeddingWorkflowProgressBullMqLookup({
      getJob: vi.fn().mockResolvedValue(parent),
    } as unknown as Queue<FinalizeEmbeddingWorkflowCommand>);

    await expect(lookup.find({ syncJobId: 'sync-job-1' })).resolves.toEqual({
      totalChunks: 4,
      processedChunks: 4,
    });
  });

  it('workflow가 없으면 null을 반환한다', async () => {
    const lookup = new SourceEmbeddingWorkflowProgressBullMqLookup({
      getJob: vi.fn().mockResolvedValue(undefined),
    } as unknown as Queue<FinalizeEmbeddingWorkflowCommand>);

    await expect(lookup.find({ syncJobId: 'missing' })).resolves.toBeNull();
  });
});
