import { DomainEvent, type DomainEventParams } from '@kernels/domain';

interface SourceSyncJobCreatedDomainEventParams extends DomainEventParams {
  readonly sourceId: string;
  readonly content: string;
  readonly fingerprint: string;
}

type EventName = 'source.sync_job.created';

export class SourceSyncJobCreatedDomainEvent extends DomainEvent<EventName> {
  readonly eventName = 'source.sync_job.created';
  readonly sourceId: string;
  readonly content: string;
  readonly fingerprint: string;

  constructor(params: SourceSyncJobCreatedDomainEventParams) {
    super(params);
    this.sourceId = params.sourceId;
    this.content = params.content;
    this.fingerprint = params.fingerprint;
  }
}