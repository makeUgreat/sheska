import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  noticeMessages,
  fileMenuItems,
  fileMenuHandler,
  TFile,
  Menu,
} from '../__mocks__/obsidian';
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
    fileMenuItems.length = 0;
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

      expect(plugin.settings).toMatchObject({
        apiBaseUrl: DEFAULT_SETTINGS.apiBaseUrl,
        healthCheckIntervalMinutes: DEFAULT_SETTINGS.healthCheckIntervalMinutes,
      });
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

  describe('health check interval', () => {
    it('starts an interval on load when healthCheckIntervalMinutes > 0', async () => {
      vi.useFakeTimers();
      plugin = makePlugin({ healthCheckIntervalMinutes: 1 });

      await plugin.onload();

      expect(plugin.registerInterval).toHaveBeenCalledOnce();
      vi.useRealTimers();
    });

    it('does not start an interval when healthCheckIntervalMinutes is 0', async () => {
      plugin = makePlugin({ healthCheckIntervalMinutes: 0 });

      await plugin.onload();

      expect(plugin.registerInterval).not.toHaveBeenCalled();
    });

    it('restarts the interval after saveSettings', async () => {
      vi.useFakeTimers();
      plugin = makePlugin({ healthCheckIntervalMinutes: 1 });
      await plugin.onload();
      vi.mocked(plugin.registerInterval).mockClear();

      await plugin.saveSettings();

      expect(plugin.registerInterval).toHaveBeenCalledOnce();
      vi.useRealTimers();
    });

    it('shows failure Notice when health check fires and API is unreachable', async () => {
      vi.useFakeTimers();
      plugin = makePlugin({ healthCheckIntervalMinutes: 1 });
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      );

      await plugin.onload();
      await vi.advanceTimersByTimeAsync(60 * 1000);

      expect(noticeMessages).toContain(
        'Sheska API health check failed. Check settings.',
      );
      vi.useRealTimers();
    });
  });

  describe('sheska-upload-note command', () => {
    async function getUploadCallback(): Promise<() => Promise<void>> {
      await plugin.onload();
      const calls = vi.mocked(plugin.addCommand).mock.calls;
      const uploadCall = calls.find((c) => c[0].id === 'sheska-upload-note');
      return (uploadCall![0] as unknown as { callback: () => Promise<void> })
        .callback;
    }

    it('registers the sheska-upload-note command', async () => {
      await plugin.onload();

      expect(plugin.addCommand).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sheska-upload-note' }),
      );
    });

    it('shows success Notice when upload succeeds', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              sourceId: '1',
              externalSourceId: 'test.md',
              fingerprint: 'abc',
            }),
        }),
      );
      plugin.app.workspace.getActiveFile = vi
        .fn()
        .mockReturnValue(new TFile('test.md'));
      plugin.app.vault.read = vi.fn().mockResolvedValue('# Hello');
      const callback = await getUploadCallback();

      await callback();

      expect(noticeMessages).toContain('Note uploaded to Sheska.');
    });

    it('shows Notice when there is no active file', async () => {
      plugin.app.workspace.getActiveFile = vi.fn().mockReturnValue(null);
      const callback = await getUploadCallback();

      await callback();

      expect(noticeMessages).toContain('No active note to upload.');
    });

    it('shows failure Notice with error message when upload fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      );
      plugin.app.workspace.getActiveFile = vi
        .fn()
        .mockReturnValue(new TFile('test.md'));
      plugin.app.vault.read = vi.fn().mockResolvedValue('content');
      const callback = await getUploadCallback();

      await callback();

      expect(noticeMessages).toContain(
        'Failed to upload note to Sheska: ECONNREFUSED',
      );
    });
  });

  describe('file-menu upload item', () => {
    it('registers a file-menu event handler', async () => {
      await plugin.onload();

      expect(plugin.registerEvent).toHaveBeenCalledOnce();
    });

    it('adds an Upload to Sheska item to the file menu', async () => {
      await plugin.onload();
      const handler = fileMenuHandler!;
      const menu = new Menu();
      const file = new TFile('note.md');

      handler(menu, file);

      expect(fileMenuItems).toHaveLength(1);
      expect(fileMenuItems[0].title).toBe('Upload to Sheska');
    });

    it('shows success Notice when file-menu upload succeeds', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              sourceId: '2',
              externalSourceId: 'note.md',
              fingerprint: 'xyz',
            }),
        }),
      );
      plugin.app.vault.read = vi.fn().mockResolvedValue('# Note');
      await plugin.onload();
      const handler = fileMenuHandler!;
      const menu = new Menu();
      handler(menu, new TFile('note.md'));

      await fileMenuItems[0].click();

      expect(noticeMessages).toContain('Note uploaded to Sheska.');
    });

    it('shows failure Notice with error message when file-menu upload fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      );
      plugin.app.vault.read = vi.fn().mockResolvedValue('content');
      await plugin.onload();
      const handler = fileMenuHandler!;
      const menu = new Menu();
      handler(menu, new TFile('note.md'));

      await fileMenuItems[0].click();

      expect(noticeMessages).toContain(
        'Failed to upload note to Sheska: Network error',
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
