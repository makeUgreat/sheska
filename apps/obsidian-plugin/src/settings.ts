import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

export interface SheskaSettings {
  apiBaseUrl: string;
}

export const DEFAULT_SETTINGS: SheskaSettings = {
  apiBaseUrl: 'http://localhost:3000',
};

interface PluginWithSettings extends Plugin {
  settings: SheskaSettings;
  saveSettings(): Promise<void>;
}

interface TextSettingDefinition<Key extends keyof SheskaSettings> {
  name: string;
  desc: string;
  control: {
    type: 'text';
    key: Key;
    placeholder?: string;
  };
}

export class SheskaSettingTab extends PluginSettingTab {
  private readonly pluginWithSettings: PluginWithSettings;

  constructor(app: App, plugin: PluginWithSettings) {
    super(app, plugin);
    this.pluginWithSettings = plugin;
  }

  getSettingDefinitions(): TextSettingDefinition<keyof SheskaSettings>[] {
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
              this.pluginWithSettings.settings[control.key] = value;
              await this.pluginWithSettings.saveSettings();
            });
        });
      }
    }
  }
}
