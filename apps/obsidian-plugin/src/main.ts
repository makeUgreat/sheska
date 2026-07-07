import { Notice, Plugin, TFile } from 'obsidian';
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

    this.addCommand({
      id: 'sheska-upload-note',
      name: 'Upload current note to Sheska',
      callback: async () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice('No active note to upload.');
          return;
        }
        await this.uploadFile(file);
      },
    });

    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, abstractFile) => {
        if (!(abstractFile instanceof TFile)) return;
        menu.addItem((item) => {
          item.setTitle('Upload to Sheska').onClick(async () => {
            await this.uploadFile(abstractFile);
          });
        });
      }),
    );

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

  private async uploadFile(file: TFile): Promise<void> {
    try {
      const content = await this.app.vault.read(file);
      await this.api.uploadSource({ externalSourceId: file.path, content });
      new Notice('Note uploaded to Sheska.');
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      new Notice(`Failed to upload note to Sheska: ${reason}`);
    }
  }

  private stopHealthCheckInterval(): void {
    if (this.healthCheckIntervalId !== null) {
      window.clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
    }
  }
}
