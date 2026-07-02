import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

export interface SheskaSettings {
  apiBaseUrl: string;
  healthCheckIntervalMinutes: number;
}

export const DEFAULT_SETTINGS: SheskaSettings = {
  apiBaseUrl: 'http://localhost:3000',
  healthCheckIntervalMinutes: 5,
};

interface PluginWithSettings extends Plugin {
  settings: SheskaSettings;
  saveSettings(): Promise<void>;
  api: { health(): Promise<unknown> };
}

interface TextControl<Key extends keyof SheskaSettings> {
  type: 'text';
  key: Key;
  placeholder?: string;
}

interface NumberControl<Key extends keyof SheskaSettings> {
  type: 'number';
  key: Key;
  min?: number;
  max?: number;
}

interface SettingDefinition<Key extends keyof SheskaSettings> {
  name: string;
  desc: string;
  control: TextControl<Key> | NumberControl<Key>;
}

export class SheskaSettingTab extends PluginSettingTab {
  private readonly pluginWithSettings: PluginWithSettings;

  constructor(app: App, plugin: PluginWithSettings) {
    super(app, plugin);
    this.pluginWithSettings = plugin;
  }

  getSettingDefinitions(): SettingDefinition<keyof SheskaSettings>[] {
    return [
      {
        name: 'API base URL',
        desc: 'The base URL of your Sheska API instance.',
        control: {
          type: 'text',
          key: 'apiBaseUrl',
          placeholder: 'http://localhost:3000',
        },
      },
      {
        name: 'Health check interval (minutes)',
        desc: 'How often to automatically ping the Sheska API in the background. Set to 0 to disable.',
        control: {
          type: 'number',
          key: 'healthCheckIntervalMinutes',
          min: 0,
        },
      },
    ];
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    for (const def of this.getSettingDefinitions()) {
      const setting = new Setting(containerEl)
        .setName(def.name)
        .setDesc(def.desc);
      const { control } = def;

      if (control.type === 'text') {
        setting.addText((text) => {
          text
            .setPlaceholder(control.placeholder ?? '')
            .setValue(
              String(this.pluginWithSettings.settings[control.key] ?? ''),
            )
            .onChange(async (value) => {
              (this.pluginWithSettings.settings as unknown as Record<string, unknown>)[
                control.key
              ] = value;
              await this.pluginWithSettings.saveSettings();
            });
        });
      } else if (control.type === 'number') {
        setting.addText((text) => {
          text.inputEl.type = 'number';
          if (control.min !== undefined)
            text.inputEl.min = String(control.min);
          if (control.max !== undefined)
            text.inputEl.max = String(control.max);
          text
            .setValue(
              String(this.pluginWithSettings.settings[control.key] ?? ''),
            )
            .onChange(async (value) => {
              const parsed = Number(value);
              if (!Number.isNaN(parsed)) {
                (this.pluginWithSettings.settings as unknown as Record<string, unknown>)[
                  control.key
                ] = parsed;
                await this.pluginWithSettings.saveSettings();
              }
            });
        });
      }
    }

    new Setting(containerEl)
      .setName('Test connection')
      .setDesc('Check if the Sheska API is reachable with the current URL.')
      .addButton((button) => {
        button.setButtonText('Ping').onClick(async () => {
          button.setDisabled(true);
          try {
            await this.pluginWithSettings.api.health();
            button.setButtonText('✓ Connected');
            new Notice('Sheska API is reachable.');
          } catch {
            button.setButtonText('✗ Failed');
            new Notice('Failed to reach Sheska API. Check settings.');
          } finally {
            window.setTimeout(() => {
              button.setButtonText('Ping');
              button.setDisabled(false);
            }, 3000);
          }
        });
      });
  }
}
