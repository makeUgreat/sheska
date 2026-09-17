import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { type Queue } from 'bullmq';
import {
  SOURCE_EMBEDDING_FINALIZATION_QUEUE,
  type EmbeddingWorkflowProgressLookup,
} from '@contexts/ingestion/application/ports';
import { type FinalizeEmbeddingWorkflowCommand } from '@contexts/ingestion/application/use-cases/finalize-embedding-workflow.use-case';

@Injectable()
export class SourceEmbeddingWorkflowProgressBullMqLookup implements EmbeddingWorkflowProgressLookup {
  constructor(
    @InjectQueue(SOURCE_EMBEDDING_FINALIZATION_QUEUE)
    private readonly finalizeQueue: Queue<FinalizeEmbeddingWorkflowCommand>,
  ) {}

  async find(criteria: { syncJobId: string }) {
    const parent = await this.finalizeQueue.getJob(criteria.syncJobId);
    if (!parent) return null;

    const totalChunks = parent.data.totalChunks;
    const { processed: processedChunkCount = 0 } =
      await parent.getDependenciesCount({ processed: true });

    return {
      totalChunks,
      processedChunks: Math.min(totalChunks, processedChunkCount),
    };
  }
}
