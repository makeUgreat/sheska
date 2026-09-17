import {
  IntegrationEvent,
  type IntegrationEventParams,
} from '@kernels/application';

interface IngestionCompletedIntegrationEventParams extends IntegrationEventParams {
  readonly syncJobId: string;
  readonly totalChunks: number;
}

interface IngestionFailedIntegrationEventParams extends IntegrationEventParams {
  readonly syncJobId: string;
}

export class IngestionCompletedIntegrationEvent extends IntegrationEvent {
  readonly eventType = 'source.ingestion.completed';
  readonly eventVersion = 1;
  readonly payload: {
    readonly syncJobId: string;
    readonly totalChunks: number;
  };

  constructor(params: IngestionCompletedIntegrationEventParams) {
    super(params);
    this.payload = {
      syncJobId: params.syncJobId,
      totalChunks: params.totalChunks,
    };
  }
}

export class IngestionFailedIntegrationEvent extends IntegrationEvent {
  readonly eventType = 'source.ingestion.failed';
  readonly eventVersion = 1;
  readonly payload: { readonly syncJobId: string };

  constructor(params: IngestionFailedIntegrationEventParams) {
    super(params);
    this.payload = { syncJobId: params.syncJobId };
  }
}
