import { describe, expect, it, vi } from 'vitest';
import { type FlowJob, type FlowProducer } from 'bullmq';
import { SourceEmbeddingWorkflowBullMqDispatcher } from '../source-embedding-workflow.bullmq.dispatcher';

describe('SourceEmbeddingWorkflowBullMqDispatcher', () => {
  it('finalize parent와 chunk child들로 flow를 등록한다', async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const dispatcher = new SourceEmbeddingWorkflowBullMqDispatcher({
      add,
    } as unknown as FlowProducer);

    await dispatcher.dispatch({
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      chunks: [
        { chunkIndex: 0, chunkContent: 'first' },
        { chunkIndex: 1, chunkContent: 'second' },
      ],
    });

    const flow = add.mock.calls[0][0] as FlowJob;
    expect(flow).toMatchObject({
      name: 'finalize-embedding',
      queueName: 'source-embedding-finalization',
      opts: { jobId: 'sync-job-1' },
    });
    expect(flow.children).toHaveLength(2);
    expect(flow.children?.[0]).toMatchObject({
      name: 'embed-chunk',
      queueName: 'source-embedding-chunk',
      opts: {
        jobId: 'sync-job-1-0',
        failParentOnFailure: true,
      },
    });
    expect(flow.children?.[1].opts).toMatchObject({ jobId: 'sync-job-1-1' });
  });
});
