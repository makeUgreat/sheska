import { describe, it, expect, vi, beforeEach } from 'vitest';
import { noticeMessages } from '../__mocks__/obsidian';
import SheskaPlugin from './main';
import { DEFAULT_SETTINGS } from './settings';

function makePlugin(
  loadDataResult: Record<string, unknown> = {},
): SheskaPlugin {
  const plugin = new SheskaPlugin({} as never, {} as never);
  plugin.loadData = vi.fn().mockResolvedValue(loadDataResult);
  plugin.saveData = vi.fn().mockResolvedValue(undefined);
  return plugin;
}

describe('SheskaPlugin', () => {
  let plugin: SheskaPlugin;

  beforeEach(() => {
    plugin = makePlugin();
    noticeMessages.length = 0;
    vi.clearAllMocks();
  });

  describe('onload', () => {
    it('loads settings and initialises the API client', async () => {
      await plugin.onload();

      expect(plugin.settings).toMatchObject(DEFAULT_SETTINGS);
      expect(plugin.api).toBeDefined();
    });

    it('registers the setting tab', async () => {
      await plugin.onload();

      expect(plugin.addSettingTab).toHaveBeenCalledOnce();
    });

    it('registers the sheska-ping command', async () => {
      await plugin.onload();

      expect(plugin.addCommand).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sheska-ping' }),
      );
    });
  });

  describe('loadSettings', () => {
    it('falls back to DEFAULT_SETTINGS when loadData returns empty', async () => {
      await plugin.loadSettings();

      expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
    });

    it('merges saved data over defaults', async () => {
      plugin.loadData = vi
        .fn()
        .mockResolvedValue({ apiBaseUrl: 'http://prod:80' });

      await plugin.loadSettings();

      expect(plugin.settings.apiBaseUrl).toBe('http://prod:80');
    });
  });

  describe('saveSettings', () => {
    it('persists current settings', async () => {
      await plugin.loadSettings();
      plugin.settings.apiBaseUrl = 'http://staging:3001';

      await plugin.saveSettings();

      expect(plugin.saveData).toHaveBeenCalledWith(
        expect.objectContaining({ apiBaseUrl: 'http://staging:3001' }),
      );
    });
  });

  describe('sheska-ping command', () => {
    async function getPingCallback(): Promise<() => Promise<void>> {
      await plugin.onload();
      const commandArg = vi.mocked(plugin.addCommand).mock.calls[0][0];
      return (commandArg as unknown as { callback: () => Promise<void> })
        .callback;
    }

    it('shows success Notice when API is reachable', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
      );
      const callback = await getPingCallback();

      await callback();

      expect(noticeMessages).toContain('Sheska API is reachable.');
    });

    it('shows failure Notice when API is unreachable', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      );
      const callback = await getPingCallback();

      await callback();

      expect(noticeMessages).toContain(
        'Failed to reach Sheska API. Check settings.',
      );
    });
  });
});
