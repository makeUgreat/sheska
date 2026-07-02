import { Notice, Plugin } from 'obsidian';
import { SheskaApiClient } from '@/api/client';
import { DEFAULT_SETTINGS, SheskaSettingTab } from '@/settings';
import type { SheskaSettings } from '@/settings';

export default class SheskaPlugin extends Plugin {
  declare settings: SheskaSettings;
  declare api: SheskaApiClient;
  private healthCheckIntervalId: number | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.api = new SheskaApiClient(this.settings.apiBaseUrl);

    this.addSettingTab(new SheskaSettingTab(this.app, this));

    this.addCommand({
      id: 'sheska-ping',
      name: 'Ping Sheska API',
      callback: async () => {
        try {
          await this.api.health();
          new Notice('Sheska API is reachable.');
        } catch {
          new Notice('Failed to reach Sheska API. Check settings.');
        }
      },
    });

    this.startHealthCheckInterval();
  }

  onunload(): void {
    this.stopHealthCheckInterval();
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<SheskaSettings>;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.stopHealthCheckInterval();
    this.startHealthCheckInterval();
  }

  private startHealthCheckInterval(): void {
    const minutes = this.settings.healthCheckIntervalMinutes;
    if (minutes <= 0) return;
    this.healthCheckIntervalId = this.registerInterval(
      window.setInterval(() => {
        this.api.health().catch(() => {
          new Notice('Sheska API health check failed. Check settings.');
        });
      }, minutes * 60 * 1000),
    );
  }

  private stopHealthCheckInterval(): void {
    if (this.healthCheckIntervalId !== null) {
      window.clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
    }
  }
}
