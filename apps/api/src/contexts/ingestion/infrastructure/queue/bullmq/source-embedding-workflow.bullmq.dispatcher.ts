import { Injectable } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { type FlowChildJob, type FlowJob, type FlowProducer } from 'bullmq';
import {
  SOURCE_EMBEDDING_CHUNK_QUEUE,
  SOURCE_EMBEDDING_FINALIZATION_QUEUE,
  SOURCE_EMBEDDING_FLOW_PRODUCER,
  type EmbeddingWorkflowDispatcher,
  type EmbeddingWorkflowPayload,
} from '@contexts/ingestion/application/ports';
import { type EmbedSourceChunkCommand } from '@contexts/ingestion/application/use-cases/embed-source-chunk.use-case';
import { type FinalizeEmbeddingWorkflowCommand } from '@contexts/ingestion/application/use-cases/finalize-embedding-workflow.use-case';

@Injectable()
export class SourceEmbeddingWorkflowBullMqDispatcher implements EmbeddingWorkflowDispatcher {
  constructor(
    @InjectFlowProducer(SOURCE_EMBEDDING_FLOW_PRODUCER)
    private readonly flowProducer: FlowProducer,
  ) {}

  async dispatch(payload: EmbeddingWorkflowPayload): Promise<void> {
    const parentJob = this.createParentJob(payload);
    const childJobs = this.createChunkJobs(payload);

    await this.flowProducer.add({
      ...parentJob,
      children: childJobs,
    });
  }

  private createParentJob(payload: EmbeddingWorkflowPayload): FlowJob {
    const { sourceId, syncJobId, chunks } = payload;

    return {
      name: 'finalize-embedding',
      queueName: SOURCE_EMBEDDING_FINALIZATION_QUEUE,
      data: {
        sourceId,
        syncJobId,
        totalChunks: chunks.length,
      } satisfies FinalizeEmbeddingWorkflowCommand,
      opts: { jobId: syncJobId },
    };
  }

  private createChunkJobs({
    sourceId,
    syncJobId,
    chunks,
  }: EmbeddingWorkflowPayload): FlowChildJob[] {
    return chunks.map((chunk) => ({
      name: 'embed-chunk',
      queueName: SOURCE_EMBEDDING_CHUNK_QUEUE,
      data: {
        sourceId,
        syncJobId,
        ...chunk,
      } satisfies EmbedSourceChunkCommand,
      opts: {
        jobId: `${syncJobId}-${chunk.chunkIndex}`,
        failParentOnFailure: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1_000, jitter: 1 },
      },
    }));
  }
}
