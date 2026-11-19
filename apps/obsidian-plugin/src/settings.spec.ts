import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App, noticeMessages, renderedSettings } from '../__mocks__/obsidian';
import { DEFAULT_SETTINGS, SheskaSettingTab } from './settings';

describe('DEFAULT_SETTINGS', () => {
  it('defaults apiBaseUrl to localhost:3000', () => {
    expect(DEFAULT_SETTINGS.apiBaseUrl).toBe('http://localhost:3000');
  });

  it('defaults healthCheckIntervalMinutes to 5', () => {
    expect(DEFAULT_SETTINGS.healthCheckIntervalMinutes).toBe(5);
  });

  it('defaults autoSyncEnabled to true', () => {
    expect(DEFAULT_SETTINGS.autoSyncEnabled).toBe(true);
  });

  it('defaults autoSyncDebounceSeconds to 20', () => {
    expect(DEFAULT_SETTINGS.autoSyncDebounceSeconds).toBe(20);
  });

  it('defaults autoSyncSweepIntervalMinutes to 30', () => {
    expect(DEFAULT_SETTINGS.autoSyncSweepIntervalMinutes).toBe(30);
  });

  it('defaults syncJobReconcileIntervalMinutes to 1', () => {
    expect(DEFAULT_SETTINGS.syncJobReconcileIntervalMinutes).toBe(1);
  });
});

function makeTab(
  api = { health: vi.fn().mockResolvedValue({ status: 'ok' }) },
  resetSyncCache = vi.fn().mockResolvedValue(undefined),
  app = new App(),
): SheskaSettingTab {
  const plugin = {
    settings: { ...DEFAULT_SETTINGS },
    saveSettings: vi.fn().mockResolvedValue(undefined),
    api,
    resetSyncCache,
  };
  return new SheskaSettingTab(app as never, plugin as never);
}

describe('SheskaSettingTab', () => {
  describe('display', () => {
    beforeEach(() => {
      renderedSettings.length = 0;
      noticeMessages.length = 0;
    });

    it('renders a row for each setting definition plus the API token, ping, and reset rows', () => {
      const tab = makeTab();

      tab.display();

      expect(renderedSettings).toHaveLength(
        tab.getSettingDefinitions().length + 3,
      );
    });

    describe('API token row', () => {
      function tokenRow() {
        const row = renderedSettings.find((each) => each.name === 'API token');
        if (!row) throw new Error('API token row not rendered');
        return row.textInputs[0] as unknown as {
          inputEl: { type: string };
          setValue: ReturnType<typeof vi.fn>;
          onChange: ReturnType<typeof vi.fn>;
        };
      }

      it('masks the token input', () => {
        makeTab().display();

        expect(tokenRow().inputEl.type).toBe('password');
      });

      it('shows the token kept in secret storage', () => {
        const app = new App();
        app.secretStorage.setSecret('sheska-api-token', 'shk_saved');

        makeTab(undefined, undefined, app).display();

        expect(tokenRow().setValue).toHaveBeenCalledWith('shk_saved');
      });

      it('writes a changed token to secret storage, not to the settings', () => {
        const app = new App();
        const tab = makeTab(undefined, undefined, app);
        tab.display();

        const onChange = tokenRow().onChange.mock.calls[0][0] as (
          value: string,
        ) => void;
        onChange(' shk_new ');

        expect(app.secretStorage.getSecret('sheska-api-token')).toBe('shk_new');
        const plugin = (
          tab as unknown as {
            pluginWithSettings: {
              settings: Record<string, unknown>;
              saveSettings: ReturnType<typeof vi.fn>;
            };
          }
        ).pluginWithSettings;
        expect(Object.values(plugin.settings)).not.toContain('shk_new');
        expect(plugin.saveSettings).not.toHaveBeenCalled();
      });
    });

    it('renders apiBaseUrl as the first setting', () => {
      const tab = makeTab();

      tab.display();

      expect(renderedSettings[0]).toMatchObject({ name: 'API base URL' });
    });

    it('renders the API token right below apiBaseUrl', () => {
      const tab = makeTab();

      tab.display();

      expect(renderedSettings[1]).toMatchObject({ name: 'API token' });
    });

    it('renders healthCheckIntervalMinutes after the API token', () => {
      const tab = makeTab();

      tab.display();

      expect(renderedSettings[2]).toMatchObject({
        name: 'Health check interval (minutes)',
      });
    });

    it('renders the health check interval control as a number input', () => {
      const tab = makeTab();

      tab.display();

      expect(renderedSettings[2].textInputs[0].inputEl.type).toBe('number');
    });

    it('renders autoSyncEnabled as a toggle reflecting the current setting', () => {
      const tab = makeTab();

      tab.display();

      expect(renderedSettings[3].toggles[0].value).toBe(
        DEFAULT_SETTINGS.autoSyncEnabled,
      );
    });

    it('updates autoSyncEnabled and saves when the toggle changes', async () => {
      const tab = makeTab();
      tab.display();

      await renderedSettings[3].toggles[0].onChange(false);

      const plugin = (
        tab as unknown as {
          pluginWithSettings: {
            settings: { autoSyncEnabled: boolean };
            saveSettings: ReturnType<typeof vi.fn>;
          };
        }
      ).pluginWithSettings;
      expect(plugin.settings.autoSyncEnabled).toBe(false);
      expect(plugin.saveSettings).toHaveBeenCalledOnce();
    });

    it('clears the container before rendering', () => {
      const tab = makeTab();

      tab.display();

      expect(
        (tab as unknown as { containerEl: { empty: ReturnType<typeof vi.fn> } })
          .containerEl.empty,
      ).toHaveBeenCalledOnce();
    });

    describe('ping button', () => {
      it('renders a ping button in the second-to-last row', () => {
        const tab = makeTab();
        tab.display();

        const pingRow = renderedSettings.at(-2)!;
        expect(pingRow.name).toBe('Test connection');
        expect(pingRow.buttons[0].text).toBe('Ping');
      });

      it('shows success Notice when API responds', async () => {
        const api = { health: vi.fn().mockResolvedValue({ status: 'ok' }) };
        const tab = makeTab(api);
        tab.display();

        await renderedSettings.at(-2)!.buttons[0].click();

        expect(noticeMessages).toContain('Sheska API is reachable.');
      });

      it('shows failure Notice when API is unreachable', async () => {
        const api = {
          health: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        };
        const tab = makeTab(api);
        tab.display();

        await renderedSettings.at(-2)!.buttons[0].click();

        expect(noticeMessages).toContain(
          'Failed to reach Sheska API. Check settings.',
        );
      });

      it('calls api.health()', async () => {
        const api = { health: vi.fn().mockResolvedValue({ status: 'ok' }) };
        const tab = makeTab(api);
        tab.display();

        await renderedSettings.at(-2)!.buttons[0].click();

        expect(api.health).toHaveBeenCalledOnce();
      });
    });

    describe('reset sync cache button', () => {
      it('renders a reset button in the last row', () => {
        const tab = makeTab();
        tab.display();

        const resetRow = renderedSettings.at(-1)!;
        expect(resetRow.name).toBe('Reset sync cache');
        expect(resetRow.buttons[0].text).toBe('Reset');
      });

      it('calls resetSyncCache and shows a Notice on click', async () => {
        const resetSyncCache = vi.fn().mockResolvedValue(undefined);
        const tab = makeTab(undefined, resetSyncCache);
        tab.display();

        await renderedSettings.at(-1)!.buttons[0].click();

        expect(resetSyncCache).toHaveBeenCalledOnce();
        expect(noticeMessages).toContain(
          'Sheska sync cache cleared. All notes and their images will re-sync.',
        );
      });
    });
  });

  describe('getSettingDefinitions', () => {
    it('returns six definitions', () => {
      const tab = new SheskaSettingTab({} as never, {} as never);

      expect(tab.getSettingDefinitions()).toHaveLength(6);
    });

    it('defines the apiBaseUrl text control', () => {
      const tab = new SheskaSettingTab({} as never, {} as never);

      expect(tab.getSettingDefinitions()[0]).toMatchObject({
        name: 'API base URL',
        desc: 'The base URL of your Sheska API instance.',
        control: {
          type: 'text',
          key: 'apiBaseUrl',
          placeholder: 'http://localhost:3000',
        },
      });
    });

    it('defines the healthCheckIntervalMinutes number control', () => {
      const tab = new SheskaSettingTab({} as never, {} as never);

      expect(tab.getSettingDefinitions()[1]).toMatchObject({
        name: 'Health check interval (minutes)',
        control: {
          type: 'number',
          key: 'healthCheckIntervalMinutes',
          min: 0,
        },
      });
    });

    it('defines the autoSyncEnabled toggle control', () => {
      const tab = new SheskaSettingTab({} as never, {} as never);

      expect(tab.getSettingDefinitions()[2]).toMatchObject({
        name: 'Auto-sync enabled',
        control: {
          type: 'toggle',
          key: 'autoSyncEnabled',
        },
      });
    });

    it('defines the autoSyncDebounceSeconds number control', () => {
      const tab = new SheskaSettingTab({} as never, {} as never);

      expect(tab.getSettingDefinitions()[3]).toMatchObject({
        name: 'Auto-sync debounce (seconds)',
        control: {
          type: 'number',
          key: 'autoSyncDebounceSeconds',
          min: 1,
        },
      });
    });

    it('defines the autoSyncSweepIntervalMinutes number control', () => {
      const tab = new SheskaSettingTab({} as never, {} as never);

      expect(tab.getSettingDefinitions()[4]).toMatchObject({
        name: 'Auto-sync sweep interval (minutes)',
        control: {
          type: 'number',
          key: 'autoSyncSweepIntervalMinutes',
          min: 0,
        },
      });
    });

    it('defines the syncJobReconcileIntervalMinutes number control', () => {
      const tab = new SheskaSettingTab({} as never, {} as never);

      expect(tab.getSettingDefinitions()[5]).toMatchObject({
        name: 'Sync-job reconcile interval (minutes)',
        control: {
          type: 'number',
          key: 'syncJobReconcileIntervalMinutes',
          min: 0,
        },
      });
    });
  });
});
