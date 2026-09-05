import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/settings';
import { PluginDataStore } from '@/storage';

function makeStore(loadDataResult: Record<string, unknown> | null = {}) {
  const plugin = {
    loadData: vi.fn().mockResolvedValue(loadDataResult),
    saveData: vi.fn().mockResolvedValue(undefined),
  };
  return { plugin, store: new PluginDataStore(plugin) };
}

describe('PluginDataStore', () => {
  describe('loadSettings', () => {
    it('falls back to DEFAULT_SETTINGS when no data is stored', async () => {
      const { store } = makeStore(null);

      await expect(store.loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
    });

    it('supports legacy flat settings data', async () => {
      const { store } = makeStore({ apiBaseUrl: 'http://legacy:3000' });

      await expect(store.loadSettings()).resolves.toMatchObject({
        ...DEFAULT_SETTINGS,
        apiBaseUrl: 'http://legacy:3000',
      });
    });

    it('loads settings from the structured settings key', async () => {
      const { store } = makeStore({
        settings: {
          apiBaseUrl: 'http://structured:3000',
          autoSyncEnabled: false,
        },
      });

      await expect(store.loadSettings()).resolves.toMatchObject({
        ...DEFAULT_SETTINGS,
        apiBaseUrl: 'http://structured:3000',
        autoSyncEnabled: false,
      });
    });
  });

  describe('loadSyncCache', () => {
    it('defaults to an empty cache', async () => {
      const { store } = makeStore();

      await expect(store.loadSyncCache()).resolves.toEqual({});
    });

    it('loads the stored sync cache', async () => {
      const syncCache = { 'note.md': { mtime: 123, syncedAt: 456 } };
      const { store } = makeStore({ syncCache });

      await expect(store.loadSyncCache()).resolves.toBe(syncCache);
    });
  });

  describe('save', () => {
    it('persists settings and sync cache in the structured data shape', async () => {
      const { plugin, store } = makeStore();
      const syncCache = { 'note.md': { mtime: 123, syncedAt: 456 } };

      await store.save(DEFAULT_SETTINGS, syncCache);

      expect(plugin.saveData).toHaveBeenCalledWith({
        settings: DEFAULT_SETTINGS,
        syncCache,
      });
    });
  });
});
