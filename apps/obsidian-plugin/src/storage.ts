import type { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS } from '@/settings';
import type { SheskaSettings } from '@/settings';

export interface SyncCacheEntry {
  mtime: number;
  syncedAt?: number;
  acceptedAt?: number;
  sourceId?: string;
  syncJobId?: string;
  fingerprint?: string;
  status?: 'accepted' | 'processing' | 'synced' | 'failed' | 'unknown' | 'retrying';
  retryCount?: number;
  nextRetryAt?: number;
}

export type SyncCache = Record<string, SyncCacheEntry>;

export interface AttachmentCacheEntry {
  mtime: number;
  size: number;
  key?: string;
  rejected?: true;
}

export type AttachmentCache = Record<string, AttachmentCacheEntry>;

export interface StoredData {
  settings?: Partial<SheskaSettings>;
  syncCache?: SyncCache;
  attachmentCache?: AttachmentCache;
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

  async loadAttachmentCache(): Promise<AttachmentCache> {
    const raw = await this.loadStoredData();
    return raw.attachmentCache ?? {};
  }

  async save(data: Required<StoredData>): Promise<void> {
    await this.plugin.saveData(data);
  }

  private async loadStoredData(): Promise<StoredData & Partial<SheskaSettings>> {
    return ((await this.plugin.loadData()) ?? {}) as StoredData & Partial<SheskaSettings>;
  }
}
