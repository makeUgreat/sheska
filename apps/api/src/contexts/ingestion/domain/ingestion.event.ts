import { DomainEvent, type DomainEventParams } from '@kernels/domain';

type IngestionStartedEventName = 'source.ingestion.started';

export class IngestionStartedDomainEvent extends DomainEvent<IngestionStartedEventName> {
  readonly eventName = 'source.ingestion.started';
  readonly syncJobId: string;
  readonly totalChunks: number;

  constructor(
    params: DomainEventParams & {
      readonly syncJobId: string;
      readonly totalChunks: number;
    },
  ) {
    super(params);
    this.syncJobId = params.syncJobId;
    this.totalChunks = params.totalChunks;
  }
}

type IngestionProgressEventName = 'source.ingestion.progress';

export class IngestionProgressDomainEvent extends DomainEvent<IngestionProgressEventName> {
  readonly eventName = 'source.ingestion.progress';
  readonly syncJobId: string;
  readonly processedChunks: number;
  readonly totalChunks: number;

  constructor(
    params: DomainEventParams & {
      readonly syncJobId: string;
      readonly processedChunks: number;
      readonly totalChunks: number;
    },
  ) {
    super(params);
    this.syncJobId = params.syncJobId;
    this.processedChunks = params.processedChunks;
    this.totalChunks = params.totalChunks;
  }
}

type IngestionCompletedEventName = 'source.ingestion.completed';

export class IngestionCompletedDomainEvent extends DomainEvent<IngestionCompletedEventName> {
  readonly eventName = 'source.ingestion.completed';
  readonly syncJobId: string;

  constructor(params: DomainEventParams & { readonly syncJobId: string }) {
    super(params);
    this.syncJobId = params.syncJobId;
  }
}

type IngestionFailedEventName = 'source.ingestion.failed';

export class IngestionFailedDomainEvent extends DomainEvent<IngestionFailedEventName> {
  readonly eventName = 'source.ingestion.failed';
  readonly syncJobId: string;

  constructor(params: DomainEventParams & { readonly syncJobId: string }) {
    super(params);
    this.syncJobId = params.syncJobId;
  }
}
