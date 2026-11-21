import { OutboxMessage, type OutboxMessageParams } from '@kernels/application';

interface SourceBodyChangedEventParams extends OutboxMessageParams {
  readonly sourceId: string;
}

export class SourceBodyChangedEvent extends OutboxMessage {
  readonly eventType = 'source.body_changed';
  readonly eventVersion = 1;
  readonly payload: {
    readonly sourceId: string;
  };

  constructor(params: SourceBodyChangedEventParams) {
    super(params);
    this.payload = { sourceId: params.sourceId };
  }
}
