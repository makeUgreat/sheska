import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  type IntegrationEvent,
  type IntegrationEventDispatcher,
} from '@kernels/application';

@Injectable()
export class IntegrationEventEmitterDispatcher implements IntegrationEventDispatcher {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async dispatch(event: IntegrationEvent): Promise<void> {
    const listenerResults = await this.eventEmitter.emitAsync(
      event.eventType,
      event,
    );

    const hadListeners = listenerResults.length > 0;

    if (!hadListeners) {
      throw new Error(`No listener registered for ${event.eventType}`);
    }
  }
}
