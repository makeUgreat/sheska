import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  noticeMessages,
  fileMenuItems,
  fileMenuHandler,
  vaultEventHandlers,
  workspaceEventHandlers,
  statusBarItems,
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
    statusBarItems.length = 0;
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
        expect.objectContaining({
          settings: expect.objectContaining({
            apiBaseUrl: 'http://staging:3001',
          }),
        }),
      );
    });

    it('rebuilds the API client after the base URL changes', async () => {
      plugin = makePlugin({
        healthCheckIntervalMinutes: 0,
        autoSyncEnabled: false,
      });
      await plugin.onload();
      plugin.settings.apiBaseUrl = 'http://staging:3001';
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
      );

      await plugin.saveSettings();
      const commandArg = vi.mocked(plugin.addCommand).mock.calls[0][0];
      await (
        commandArg as unknown as { callback: () => Promise<void> }
      ).callback();

      expect(fetch).toHaveBeenCalledWith('http://staging:3001/readyz', {
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  describe('loadSyncCache', () => {
    it('defaults to an empty object when no cache is stored', async () => {
      await plugin.loadSyncCache();

      expect(
        (plugin as unknown as { syncCache: Record<string, unknown> }).syncCache,
      ).toEqual({});
    });

    it('loads a previously persisted cache', async () => {
      plugin.loadData = vi.fn().mockResolvedValue({
        syncCache: { 'a.md': { mtime: 1, syncedAt: 2 } },
      });

      await plugin.loadSyncCache();

      expect(
        (plugin as unknown as { syncCache: Record<string, unknown> }).syncCache,
      ).toEqual({ 'a.md': { mtime: 1, syncedAt: 2 } });
    });
  });

  describe('health check interval', () => {
    it('starts an interval on load when healthCheckIntervalMinutes > 0', async () => {
      vi.useFakeTimers();
      plugin = makePlugin({
        healthCheckIntervalMinutes: 1,
        autoSyncEnabled: false,
      });

      await plugin.onload();

      expect(plugin.registerInterval).toHaveBeenCalledOnce();
      vi.useRealTimers();
    });

    it('does not start an interval when healthCheckIntervalMinutes is 0', async () => {
      plugin = makePlugin({
        healthCheckIntervalMinutes: 0,
        autoSyncEnabled: false,
      });

      await plugin.onload();

      expect(plugin.registerInterval).not.toHaveBeenCalled();
    });

    it('restarts the interval after saveSettings', async () => {
      vi.useFakeTimers();
      plugin = makePlugin({
        healthCheckIntervalMinutes: 1,
        autoSyncEnabled: false,
      });
      await plugin.onload();
      vi.mocked(plugin.registerInterval).mockClear();

      await plugin.saveSettings();

      expect(plugin.registerInterval).toHaveBeenCalledOnce();
      vi.useRealTimers();
    });

    it('shows failure Notice when health check fires and API is unreachable', async () => {
      vi.useFakeTimers();
      plugin = makePlugin({
        healthCheckIntervalMinutes: 1,
        autoSyncEnabled: false,
      });
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

      expect(plugin.registerEvent).toHaveBeenCalledTimes(4);
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

  describe('sync status bar', () => {
    it('creates a status bar item on load and clears it when there is no active file', async () => {
      plugin.app.workspace.getActiveFile = vi.fn().mockReturnValue(null);

      await plugin.onload();

      expect(plugin.addStatusBarItem).toHaveBeenCalledOnce();
      expect(statusBarItems[0].text).toBe('');
    });

    it('shows Not synced for the active file when it is not in the sync cache', async () => {
      plugin.app.workspace.getActiveFile = vi
        .fn()
        .mockReturnValue(new TFile('a.md', { ctime: 0, mtime: 100, size: 1 }));

      await plugin.onload();

      expect(statusBarItems[0].text).toBe('Sheska: ○ Not synced');
    });

    it('shows Synced for the active file when its mtime matches the cache', async () => {
      plugin = makePlugin({
        syncCache: { 'a.md': { mtime: 100, syncedAt: 1 } },
      });
      plugin.app.workspace.getActiveFile = vi
        .fn()
        .mockReturnValue(new TFile('a.md', { ctime: 0, mtime: 100, size: 1 }));

      await plugin.onload();

      expect(statusBarItems[0].text).toBe('Sheska: ✓ Synced');
    });

    it('updates the status bar when the active file changes via file-open', async () => {
      plugin = makePlugin({
        syncCache: { 'a.md': { mtime: 100, syncedAt: 1 } },
      });
      plugin.app.workspace.getActiveFile = vi.fn().mockReturnValue(null);
      await plugin.onload();
      expect(statusBarItems[0].text).toBe('');

      workspaceEventHandlers['file-open']!(
        new TFile('a.md', { ctime: 0, mtime: 100, size: 1 }),
      );

      expect(statusBarItems[0].text).toBe('Sheska: ✓ Synced');
    });

    it('refreshes the status bar after the active file is auto-synced in the background', async () => {
      vi.useFakeTimers();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              sourceId: '1',
              externalSourceId: 'a.md',
              fingerprint: 'x',
            }),
        }),
      );
      plugin = makePlugin({ autoSyncDebounceSeconds: 5 });
      const file = new TFile('a.md', { ctime: 0, mtime: 100, size: 1 });
      plugin.app.workspace.getActiveFile = vi.fn().mockReturnValue(file);
      plugin.app.vault.read = vi.fn().mockResolvedValue('content');
      await plugin.onload();
      expect(statusBarItems[0].text).toBe('Sheska: ○ Not synced');

      vaultEventHandlers['modify']!(file);
      await vi.advanceTimersByTimeAsync(5000);

      expect(statusBarItems[0].text).toBe('Sheska: ✓ Synced');
      vi.useRealTimers();
    });

    it('does not refresh the status bar when a background sync affects a different file', async () => {
      vi.useFakeTimers();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              sourceId: '1',
              externalSourceId: 'b.md',
              fingerprint: 'x',
            }),
        }),
      );
      plugin = makePlugin({ autoSyncDebounceSeconds: 5 });
      const activeFile = new TFile('a.md', { ctime: 0, mtime: 100, size: 1 });
      const otherFile = new TFile('b.md', { ctime: 0, mtime: 200, size: 1 });
      plugin.app.workspace.getActiveFile = vi.fn().mockReturnValue(activeFile);
      plugin.app.vault.read = vi.fn().mockResolvedValue('content');
      await plugin.onload();
      expect(statusBarItems[0].text).toBe('Sheska: ○ Not synced');

      vaultEventHandlers['modify']!(otherFile);
      await vi.advanceTimersByTimeAsync(5000);

      expect(statusBarItems[0].text).toBe('Sheska: ○ Not synced');
      vi.useRealTimers();
    });
  });

  describe('auto-sync', () => {
    function stubUploadFetch(): { calls: string[] } {
      const calls: string[] = [];
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
          const body = JSON.parse((init?.body as string) ?? '{}') as {
            externalSourceId: string;
          };
          calls.push(body.externalSourceId);
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                sourceId: '1',
                externalSourceId: body.externalSourceId,
                fingerprint: 'x',
              }),
          });
        }),
      );
      return { calls };
    }

    it('registers modify and create vault event listeners', async () => {
      await plugin.onload();

      expect(vaultEventHandlers['modify']).toBeInstanceOf(Function);
      expect(vaultEventHandlers['create']).toBeInstanceOf(Function);
    });

    it('coalesces edits to two different files inside one debounce window into a single flush that uploads both', async () => {
      vi.useFakeTimers();
      const { calls } = stubUploadFetch();
      plugin = makePlugin({ autoSyncDebounceSeconds: 5 });
      plugin.app.vault.read = vi.fn().mockResolvedValue('content');
      await plugin.onload();

      const fileA = new TFile('a.md', { ctime: 0, mtime: 100, size: 1 });
      const fileB = new TFile('b.md', { ctime: 0, mtime: 200, size: 1 });
      vaultEventHandlers['modify']!(fileA);
      vaultEventHandlers['modify']!(fileB);

      await vi.advanceTimersByTimeAsync(5000);

      expect(calls.sort()).toEqual(['a.md', 'b.md']);
      vi.useRealTimers();
    });

    it('skips upload when the cached mtime matches the current file mtime', async () => {
      vi.useFakeTimers();
      const { calls } = stubUploadFetch();
      plugin = makePlugin({
        autoSyncDebounceSeconds: 5,
        syncCache: { 'a.md': { mtime: 100, syncedAt: 1 } },
      });
      plugin.app.vault.read = vi.fn().mockResolvedValue('content');
      await plugin.onload();

      vaultEventHandlers['modify']!(
        new TFile('a.md', { ctime: 0, mtime: 100, size: 1 }),
      );
      await vi.advanceTimersByTimeAsync(5000);

      expect(calls).toEqual([]);
      vi.useRealTimers();
    });

    it('does not cache a failed upload and still uploads the rest of the batch', async () => {
      vi.useFakeTimers();
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockRejectedValueOnce(new Error('boom'))
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                sourceId: '1',
                externalSourceId: 'b.md',
                fingerprint: 'x',
              }),
          }),
      );
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      plugin = makePlugin({ autoSyncDebounceSeconds: 5 });
      plugin.app.vault.read = vi.fn().mockResolvedValue('content');
      await plugin.onload();

      const fileA = new TFile('a.md', { ctime: 0, mtime: 100, size: 1 });
      const fileB = new TFile('b.md', { ctime: 0, mtime: 200, size: 1 });
      vaultEventHandlers['modify']!(fileA);
      vaultEventHandlers['modify']!(fileB);
      await vi.advanceTimersByTimeAsync(5000);

      const lastCall = vi.mocked(plugin.saveData).mock.calls.at(-1)?.[0] as {
        syncCache?: Record<string, unknown>;
      };
      expect(lastCall?.syncCache).toHaveProperty('b.md');
      expect(lastCall?.syncCache).not.toHaveProperty('a.md');
      expect(errorSpy).toHaveBeenCalled();
      vi.useRealTimers();
      errorSpy.mockRestore();
    });

    it('captures mtime before the network call, not after, so a concurrent edit is not lost', async () => {
      vi.useFakeTimers();
      const { calls } = stubUploadFetch();
      plugin = makePlugin({ autoSyncDebounceSeconds: 5 });
      const file = new TFile('a.md', { ctime: 0, mtime: 100, size: 1 });
      plugin.app.vault.read = vi.fn().mockImplementation(() => {
        // Simulate a newer edit landing while this upload is in flight.
        file.stat.mtime = 999;
        return Promise.resolve('content');
      });
      await plugin.onload();

      vaultEventHandlers['modify']!(file);
      await vi.advanceTimersByTimeAsync(5000);

      expect(calls).toEqual(['a.md']);
      const lastCall = vi.mocked(plugin.saveData).mock.calls.at(-1)?.[0] as {
        syncCache?: Record<string, { mtime: number }>;
      };
      expect(lastCall?.syncCache?.['a.md']?.mtime).toBe(100);
      vi.useRealTimers();
    });

    it('does not upload on vault events when autoSyncEnabled is false', async () => {
      vi.useFakeTimers();
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      plugin = makePlugin({
        autoSyncEnabled: false,
        autoSyncDebounceSeconds: 1,
      });
      plugin.app.vault.read = vi.fn().mockResolvedValue('content');
      await plugin.onload();

      vaultEventHandlers['modify']!(
        new TFile('a.md', { ctime: 0, mtime: 100, size: 1 }),
      );
      await vi.advanceTimersByTimeAsync(5000);

      expect(fetchMock).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('manual upload always uploads even when the cache says the file is unchanged', async () => {
      const { calls } = stubUploadFetch();
      const file = new TFile('a.md', { ctime: 0, mtime: 100, size: 1 });
      plugin = makePlugin({
        syncCache: { 'a.md': { mtime: 100, syncedAt: 1 } },
      });
      plugin.app.workspace.getActiveFile = vi.fn().mockReturnValue(file);
      plugin.app.vault.read = vi.fn().mockResolvedValue('content');
      await plugin.onload();
      const uploadCall = vi
        .mocked(plugin.addCommand)
        .mock.calls.find((c) => c[0].id === 'sheska-upload-note');
      const callback = (
        uploadCall![0] as unknown as { callback: () => Promise<void> }
      ).callback;

      await callback();

      expect(calls).toEqual(['a.md']);
    });

    it('sweep uploads only files whose mtime changed since the cache', async () => {
      const { calls } = stubUploadFetch();
      const unchanged = new TFile('unchanged.md', {
        ctime: 0,
        mtime: 100,
        size: 1,
      });
      const changed = new TFile('changed.md', {
        ctime: 0,
        mtime: 200,
        size: 1,
      });
      plugin = makePlugin({
        syncCache: { 'unchanged.md': { mtime: 100, syncedAt: 1 } },
      });
      plugin.app.vault.read = vi.fn().mockResolvedValue('content');
      // getMarkdownFiles still returns [] here, so onload's own fire-and-forget
      // initial sweep is a no-op and doesn't race with the explicit call below.
      await plugin.onload();
      plugin.app.vault.getMarkdownFiles = vi
        .fn()
        .mockReturnValue([unchanged, changed]);

      await (plugin as unknown as { runSweep(): Promise<void> }).runSweep();

      expect(calls).toEqual(['changed.md']);
    });
  });
});
