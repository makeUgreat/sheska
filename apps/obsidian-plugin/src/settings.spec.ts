import { describe, it, expect, beforeEach, vi } from 'vitest';
import { noticeMessages, renderedSettings } from '../__mocks__/obsidian';
import { DEFAULT_SETTINGS, SheskaSettingTab } from './settings';

describe('DEFAULT_SETTINGS', () => {
  it('defaults apiBaseUrl to localhost:3000', () => {
    expect(DEFAULT_SETTINGS.apiBaseUrl).toBe('http://localhost:3000');
  });

  it('defaults healthCheckIntervalMinutes to 5', () => {
    expect(DEFAULT_SETTINGS.healthCheckIntervalMinutes).toBe(5);
  });

});

function makeTab(api = { health: vi.fn().mockResolvedValue({ status: 'ok' }) }): SheskaSettingTab {
  const plugin = {
    settings: { ...DEFAULT_SETTINGS },
    saveSettings: vi.fn().mockResolvedValue(undefined),
    api,
  };
  return new SheskaSettingTab({} as never, plugin as never);
}

describe('SheskaSettingTab', () => {
  describe('display', () => {
    beforeEach(() => {
      renderedSettings.length = 0;
      noticeMessages.length = 0;
    });

    it('renders a row for each setting definition plus the ping button', () => {
      const tab = makeTab();

      tab.display();

      expect(renderedSettings).toHaveLength(tab.getSettingDefinitions().length + 1);
    });

    it('renders apiBaseUrl as the first setting', () => {
      const tab = makeTab();

      tab.display();

      expect(renderedSettings[0]).toMatchObject({ name: 'API base URL' });
    });

    it('renders healthCheckIntervalMinutes as the second setting', () => {
      const tab = makeTab();

      tab.display();

      expect(renderedSettings[1]).toMatchObject({
        name: 'Health check interval (minutes)',
      });
    });

    it('renders the health check interval control as a number input', () => {
      const tab = makeTab();

      tab.display();

      expect(renderedSettings[1].textInputs[0].inputEl.type).toBe('number');
    });

    it('clears the container before rendering', () => {
      const tab = makeTab();

      tab.display();

      expect((tab as unknown as { containerEl: { empty: ReturnType<typeof vi.fn> } }).containerEl.empty).toHaveBeenCalledOnce();
    });

    describe('ping button', () => {
      it('renders a ping button in the last row', () => {
        const tab = makeTab();
        tab.display();

        const pingRow = renderedSettings.at(-1)!;
        expect(pingRow.name).toBe('Test connection');
        expect(pingRow.buttons[0].text).toBe('Ping');
      });

      it('shows success Notice when API responds', async () => {
        const api = { health: vi.fn().mockResolvedValue({ status: 'ok' }) };
        const tab = makeTab(api);
        tab.display();

        await renderedSettings.at(-1)!.buttons[0].click();

        expect(noticeMessages).toContain('Sheska API is reachable.');
      });

      it('shows failure Notice when API is unreachable', async () => {
        const api = { health: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) };
        const tab = makeTab(api);
        tab.display();

        await renderedSettings.at(-1)!.buttons[0].click();

        expect(noticeMessages).toContain('Failed to reach Sheska API. Check settings.');
      });

      it('calls api.health()', async () => {
        const api = { health: vi.fn().mockResolvedValue({ status: 'ok' }) };
        const tab = makeTab(api);
        tab.display();

        await renderedSettings.at(-1)!.buttons[0].click();

        expect(api.health).toHaveBeenCalledOnce();
      });
    });
  });

  describe('getSettingDefinitions', () => {
    it('returns two definitions', () => {
      const tab = new SheskaSettingTab({} as never, {} as never);

      expect(tab.getSettingDefinitions()).toHaveLength(2);
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

  });
});
