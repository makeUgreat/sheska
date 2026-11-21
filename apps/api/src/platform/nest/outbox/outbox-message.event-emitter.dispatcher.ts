import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type OutboxMessage, type OutboxMessageDispatcher } from '@kernels/application';

@Injectable()
export class OutboxMessageEventEmitterDispatcher implements OutboxMessageDispatcher {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async dispatch(message: OutboxMessage): Promise<void> {
    const listenerResults = await this.eventEmitter.emitAsync(message.eventType, message);

    const hadListeners = listenerResults.length > 0;

    if (!hadListeners) {
      throw new Error(`No listener registered for ${message.eventType}`);
    }
  }
}
