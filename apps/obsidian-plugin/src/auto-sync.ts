import { TFile, debounce } from 'obsidian';
import type { Debouncer, TAbstractFile, Vault } from 'obsidian';
import type { SheskaApiClient } from '@/api/client';
import type { SheskaSettings } from '@/settings';
import type { SyncCache } from '@/storage';

interface AutoSyncServiceOptions {
  vault: Vault;
  api: SheskaApiClient;
  settings: SheskaSettings;
  syncCache: SyncCache;
  saveSyncCache(): Promise<void>;
}

export class AutoSyncService {
  private api: SheskaApiClient;
  private settings: SheskaSettings;
  private syncCache: SyncCache;
  private readonly dirtyFiles = new Map<string, TFile>();
  private isFlushing = false;
  private flushDebounced: Debouncer<[], void>;

  constructor(private readonly options: AutoSyncServiceOptions) {
    this.api = options.api;
    this.settings = options.settings;
    this.syncCache = options.syncCache;
    this.flushDebounced = this.createFlushDebouncer();
  }

  configure(api: SheskaApiClient, settings: SheskaSettings): void {
    this.api = api;
    this.settings = settings;
    this.setupFlushDebouncer();
  }

  getSyncCache(): SyncCache {
    return this.syncCache;
  }

  setSyncCache(syncCache: SyncCache): void {
    this.syncCache = syncCache;
  }

  cancel(): void {
    this.flushDebounced.cancel();
  }

  setupFlushDebouncer(): void {
    this.flushDebounced.cancel();
    this.flushDebounced = this.createFlushDebouncer();
  }

  onVaultFileChanged(file: TAbstractFile): void {
    if (!this.settings.autoSyncEnabled) return;
    if (!(file instanceof TFile)) return;
    this.dirtyFiles.set(file.path, file);
    this.flushDebounced();
  }

  async runSweep(): Promise<void> {
    for (const file of this.options.vault.getMarkdownFiles()) {
      await this.uploadIfChanged(file);
    }
  }

  async uploadFile(file: TFile): Promise<void> {
    await this.uploadFileCore(file);
  }

  private createFlushDebouncer(): Debouncer<[], void> {
    return debounce(
      () => {
        void this.flushDirtyFiles();
      },
      Math.max(this.settings.autoSyncDebounceSeconds, 0) * 1000,
      true,
    );
  }

  private async flushDirtyFiles(): Promise<void> {
    if (this.isFlushing) return;
    this.isFlushing = true;
    try {
      const snapshot = Array.from(this.dirtyFiles.values());
      this.dirtyFiles.clear();
      for (const file of snapshot) {
        await this.uploadIfChanged(file);
      }
    } finally {
      this.isFlushing = false;
      if (this.dirtyFiles.size > 0) {
        this.flushDebounced();
      }
    }
  }

  private async uploadFileCore(file: TFile): Promise<void> {
    const mtimeAtRead = file.stat.mtime;
    const content = await this.options.vault.read(file);
    await this.api.uploadSource({ externalSourceId: file.path, content });
    this.syncCache[file.path] = { mtime: mtimeAtRead, syncedAt: Date.now() };
    await this.options.saveSyncCache();
  }

  private async uploadIfChanged(file: TFile): Promise<void> {
    const cached = this.syncCache[file.path];
    if (cached && cached.mtime === file.stat.mtime) return;
    try {
      await this.uploadFileCore(file);
    } catch (err) {
      console.error(`[Sheska] Auto-sync failed for "${file.path}":`, err);
    }
  }
}
