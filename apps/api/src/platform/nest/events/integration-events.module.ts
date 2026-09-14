import { Global, Module } from '@nestjs/common';
import { INTEGRATION_EVENT_DISPATCHER } from '@kernels/application';
import { IntegrationEventEmitterDispatcher } from './integration.event-emitter.dispatcher';

@Global()
@Module({
  providers: [
    {
      provide: INTEGRATION_EVENT_DISPATCHER,
      useClass: IntegrationEventEmitterDispatcher,
    },
  ],
  exports: [INTEGRATION_EVENT_DISPATCHER],
})
export class IntegrationEventsModule {}
