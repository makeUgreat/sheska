import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { type Job, type Queue } from 'bullmq';
import { EMBEDDING_CLIENT, type EmbeddingClient } from './embedding.port';

export const EMBED_JOBS_QUEUE = 'embed-jobs';
export const EMBED_RESULTS_QUEUE = 'embed-results';

interface EmbedJobPayload {
  readonly sourceId: string;
  readonly syncJobId: string;
  readonly content: string;
}

@Processor(EMBED_JOBS_QUEUE)
@Injectable()
export class EmbedJobConsumer extends WorkerHost {
  constructor(
    @Inject(EMBEDDING_CLIENT)
    private readonly embeddingClient: EmbeddingClient,
    @InjectQueue(EMBED_RESULTS_QUEUE)
    private readonly resultsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<EmbedJobPayload>): Promise<void> {
    const { sourceId, syncJobId, content } = job.data;
    const { embedding, model } = await this.embeddingClient.embed(content);
    await this.resultsQueue.add('embed-result', {
      sourceId,
      syncJobId,
      embedding,
      model,
    });
  }
}
