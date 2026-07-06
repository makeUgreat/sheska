import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EMBEDDING_CLIENT } from './embedding.port';
import {
  EMBED_JOBS_QUEUE,
  EMBED_RESULTS_QUEUE,
  EmbedJobConsumer,
} from './embed-job.consumer';
import { OllamaEmbeddingClient } from './ollama/ollama-embedding.client';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: EMBED_JOBS_QUEUE },
      { name: EMBED_RESULTS_QUEUE },
    ),
  ],
  providers: [
    OllamaEmbeddingClient,
    { provide: EMBEDDING_CLIENT, useExisting: OllamaEmbeddingClient },
    EmbedJobConsumer,
  ],
})
export class EmbeddingModule {}
