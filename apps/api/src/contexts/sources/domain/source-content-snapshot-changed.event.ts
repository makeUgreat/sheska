import { DomainEvent, type DomainEventParams } from '@kernels/domain';

interface SourceContentSnapshotChangedDomainEventParams extends DomainEventParams<string> {
  readonly externalSourceId: string;
  readonly fingerprint: string;
}

export class SourceContentSnapshotChangedDomainEvent extends DomainEvent<
  string,
  'source.content_snapshot.changed'
> {
  readonly eventName = 'source.content_snapshot.changed';
  readonly externalSourceId: string;
  readonly fingerprint: string;

  constructor(params: SourceContentSnapshotChangedDomainEventParams) {
    super(params);
    this.externalSourceId = params.externalSourceId;
    this.fingerprint = params.fingerprint;
  }
}
