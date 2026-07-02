import { Notice, Plugin } from 'obsidian';
import { SheskaApiClient } from '@/api/client';
import { DEFAULT_SETTINGS, SheskaSettingTab } from '@/settings';
import type { SheskaSettings } from '@/settings';

export default class SheskaPlugin extends Plugin {
  declare settings: SheskaSettings;
  declare api: SheskaApiClient;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.api = new SheskaApiClient(this.settings.apiBaseUrl);

    this.addSettingTab(new SheskaSettingTab(this.app, this));

    this.addCommand({
      id: 'sheska-ping',
      name: 'Ping Sheska API',
      callback: async () => {
        try {
          await this.api.get('/health');
          new Notice('Sheska API is reachable.');
        } catch {
          new Notice('Failed to reach Sheska API. Check settings.');
        }
      },
    });
  }

  async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<SheskaSettings>;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
