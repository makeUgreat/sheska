import { Notice } from 'obsidian';
import type { SheskaApiClient } from '@/api/client';
import type { SheskaSettings } from '@/settings';

type RegisterInterval = (id: number) => number;

export class HealthCheckScheduler {
  private intervalId: number | null = null;

  constructor(
    private api: SheskaApiClient,
    private settings: SheskaSettings,
    private readonly registerInterval: RegisterInterval,
  ) {}

  configure(api: SheskaApiClient, settings: SheskaSettings): void {
    this.api = api;
    this.settings = settings;
    this.restart();
  }

  start(): void {
    const minutes = this.settings.healthCheckIntervalMinutes;
    if (minutes <= 0) return;
    this.intervalId = this.registerInterval(
      window.setInterval(
        () => {
          this.api.health().catch(() => {
            new Notice('Sheska API health check failed. Check settings.');
          });
        },
        minutes * 60 * 1000,
      ),
    );
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  restart(): void {
    this.stop();
    this.start();
  }
}
