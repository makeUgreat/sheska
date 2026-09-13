import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { LOGGER, type LoggerPort } from '@kernels/application';
import { OutboxRelay } from '@kernels/infrastructure';

export const OUTBOX_RELAY_RUNNER_OPTIONS = Symbol(
  'OUTBOX_RELAY_RUNNER_OPTIONS',
);

export interface OutboxRelayRunnerOptions {
  readonly pollIntervalMs: number;
}

@Injectable()
export class OutboxRelayRunner
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly relay: OutboxRelay,
    @Inject(OUTBOX_RELAY_RUNNER_OPTIONS)
    private readonly options: OutboxRelayRunnerOptions,
    @Inject(LOGGER)
    private readonly logger: LoggerPort,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(
      () => this.runRelay(),
      this.options.pollIntervalMs,
    );
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private runRelay(): void {
    void this.relay.relayPending().catch((error: unknown) => {
      this.logger.error('Outbox relay polling failed', error);
    });
  }
}
