import { DomainEvent, type DomainEventParams } from '@kernels/domain';

interface SourceContentSnapshotChangedDomainEventParams extends DomainEventParams {
  readonly externalSourceId: string;
  readonly fingerprint: string;
}

type EventName = 'source.content_snapshot.changed';

export class SourceContentSnapshotChangedDomainEvent extends DomainEvent<EventName> {
  readonly eventName = 'source.content_snapshot.changed';
  readonly externalSourceId: string;
  readonly fingerprint: string;

  constructor(params: SourceContentSnapshotChangedDomainEventParams) {
    super(params);
    this.externalSourceId = params.externalSourceId;
    this.fingerprint = params.fingerprint;
  }
}
