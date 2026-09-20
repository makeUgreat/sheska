import {
  IntegrationEvent,
  type IntegrationEventParams,
} from '@kernels/application';

interface SourceSyncJobCreatedIntegrationEventParams extends IntegrationEventParams {
  readonly sourceId: string;
  readonly syncJobId: string;
  readonly content: string;
}

export class SourceSyncJobCreatedIntegrationEvent extends IntegrationEvent {
  readonly eventType = 'source.sync_job.created';
  readonly eventVersion = 1;
  readonly payload: {
    readonly sourceId: string;
    readonly syncJobId: string;
    readonly content: string;
  };

  constructor(params: SourceSyncJobCreatedIntegrationEventParams) {
    super(params);
    this.payload = {
      sourceId: params.sourceId,
      syncJobId: params.syncJobId,
      content: params.content,
    };
  }
}
