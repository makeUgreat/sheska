import { DomainEvent, type DomainEventParams } from '@kernels/domain';

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
