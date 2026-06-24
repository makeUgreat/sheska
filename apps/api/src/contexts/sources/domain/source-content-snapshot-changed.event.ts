import { DomainEvent, type DomainEventParams } from '@kernels/domain';

export const SOURCE_CONTENT_SNAPSHOT_CHANGED_EVENT_NAME =
  'source.content_snapshot_changed';

interface SourceContentSnapshotChangedDomainEventParams extends DomainEventParams<string> {
  readonly externalSourceId: string;
  readonly fingerprint: string;
}

export class SourceContentSnapshotChangedDomainEvent extends DomainEvent<
  string,
  typeof SOURCE_CONTENT_SNAPSHOT_CHANGED_EVENT_NAME
> {
  readonly eventName = SOURCE_CONTENT_SNAPSHOT_CHANGED_EVENT_NAME;
  readonly externalSourceId: string;
  readonly fingerprint: string;

  constructor(params: SourceContentSnapshotChangedDomainEventParams) {
    super(params);
    this.externalSourceId = params.externalSourceId;
    this.fingerprint = params.fingerprint;
  }
}
