import { type EmbeddingWorkflowProgressLookup } from '@contexts/ingestion';
import { type SyncJobProgressLookup } from '@contexts/sources/application/ports';

export class SyncJobProgressFromIngestionLookup implements SyncJobProgressLookup {
  constructor(
    private readonly ingestionProgress: EmbeddingWorkflowProgressLookup,
  ) {}

  find(criteria: { syncJobId: string }) {
    return this.ingestionProgress.find(criteria);
  }
}
