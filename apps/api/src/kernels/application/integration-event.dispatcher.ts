import { type IntegrationEvent } from './integration-event.base';

export const INTEGRATION_EVENT_DISPATCHER = Symbol(
  'INTEGRATION_EVENT_DISPATCHER',
);

export interface IntegrationEventDispatcher {
  dispatch(event: IntegrationEvent): Promise<void>;
}
