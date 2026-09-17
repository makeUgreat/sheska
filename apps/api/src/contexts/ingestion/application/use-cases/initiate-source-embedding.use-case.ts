import { Inject, Injectable } from '@nestjs/common';
import { type EmbeddingWorkflowDispatcher } from '@contexts/ingestion/application/ports';
import { RecursiveCharacterChunker } from '@contexts/ingestion/application/services/recursive-character.chunker';
import { EMBEDDING_WORKFLOW_DISPATCHER } from '@contexts/ingestion/ingestion.di-tokens';

export interface InitiateSourceEmbeddingCommand {
  readonly sourceId: string;
  readonly syncJobId: string;
  readonly content: string;
}

@Injectable()
export class InitiateSourceEmbeddingUseCase {
  constructor(
    @Inject(EMBEDDING_WORKFLOW_DISPATCHER)
    private readonly workflowDispatcher: EmbeddingWorkflowDispatcher,
    private readonly chunker: RecursiveCharacterChunker,
  ) {}

  async execute(command: InitiateSourceEmbeddingCommand): Promise<void> {
    const chunks = this.chunker.chunk(command.content).map((chunk) => ({
      chunkIndex: chunk.index,
      chunkContent: chunk.content,
    }));

    await this.workflowDispatcher.schedule({
      sourceId: command.sourceId,
      syncJobId: command.syncJobId,
      chunks,
    });
  }
}
