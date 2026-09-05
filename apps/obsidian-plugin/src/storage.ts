import type { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS } from '@/settings';
import type { SheskaSettings } from '@/settings';

export interface SyncCacheEntry {
  mtime: number;
  syncedAt: number;
}

export type SyncCache = Record<string, SyncCacheEntry>;

export interface StoredData {
  settings?: Partial<SheskaSettings>;
  syncCache?: SyncCache;
}

type DataPlugin = Pick<Plugin, 'loadData' | 'saveData'>;

export class PluginDataStore {
  constructor(private readonly plugin: DataPlugin) {}

  async loadSettings(): Promise<SheskaSettings> {
    const raw = await this.loadStoredData();
    const savedSettings = raw.settings ?? raw;
    return Object.assign({}, DEFAULT_SETTINGS, savedSettings);
  }

  async loadSyncCache(): Promise<SyncCache> {
    const raw = await this.loadStoredData();
    return raw.syncCache ?? {};
  }

  async save(settings: SheskaSettings, syncCache: SyncCache): Promise<void> {
    await this.plugin.saveData({ settings, syncCache });
  }

  private async loadStoredData(): Promise<
    StoredData & Partial<SheskaSettings>
  > {
    return ((await this.plugin.loadData()) ?? {}) as StoredData &
      Partial<SheskaSettings>;
  }
}
