import {
  IntegrationEvent,
  type IntegrationEventParams,
} from '@kernels/application';

interface IngestionStartedIntegrationEventParams extends IntegrationEventParams {
  readonly syncJobId: string;
  readonly totalChunks: number;
}

interface IngestionProgressIntegrationEventParams extends IntegrationEventParams {
  readonly syncJobId: string;
  readonly processedChunks: number;
  readonly totalChunks: number;
}

interface IngestionCompletedIntegrationEventParams extends IntegrationEventParams {
  readonly syncJobId: string;
}

interface IngestionFailedIntegrationEventParams extends IntegrationEventParams {
  readonly syncJobId: string;
}

export class IngestionStartedIntegrationEvent extends IntegrationEvent {
  readonly eventType = 'source.ingestion.started';
  readonly eventVersion = 1;
  readonly payload: {
    readonly syncJobId: string;
    readonly totalChunks: number;
  };

  constructor(params: IngestionStartedIntegrationEventParams) {
    super(params);
    this.payload = {
      syncJobId: params.syncJobId,
      totalChunks: params.totalChunks,
    };
  }
}

export class IngestionProgressIntegrationEvent extends IntegrationEvent {
  readonly eventType = 'source.ingestion.progress';
  readonly eventVersion = 1;
  readonly payload: {
    readonly syncJobId: string;
    readonly processedChunks: number;
    readonly totalChunks: number;
  };

  constructor(params: IngestionProgressIntegrationEventParams) {
    super(params);
    this.payload = {
      syncJobId: params.syncJobId,
      processedChunks: params.processedChunks,
      totalChunks: params.totalChunks,
    };
  }
}

export class IngestionCompletedIntegrationEvent extends IntegrationEvent {
  readonly eventType = 'source.ingestion.completed';
  readonly eventVersion = 1;
  readonly payload: { readonly syncJobId: string };

  constructor(params: IngestionCompletedIntegrationEventParams) {
    super(params);
    this.payload = { syncJobId: params.syncJobId };
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
