import { type IntegrationEvent } from './integration-event.base';

export interface OutboxWriter {
  append(event: IntegrationEvent): Promise<void>;
}
