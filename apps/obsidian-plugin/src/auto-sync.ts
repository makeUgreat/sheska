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
  onSyncStart?(path: string): void;
  onSyncFinished?(path: string): void;
  onSyncStateChanged?(path: string): void;
  shouldPollSyncJob?(path: string): boolean;
  syncJobPollInitialDelayMs?: number;
  syncJobPollIntervalMs?: number;
  syncJobPollTimeoutMs?: number;
}

export class AutoSyncService {
  private api: SheskaApiClient;
  private settings: SheskaSettings;
  private syncCache: SyncCache;
  private readonly dirtyFiles = new Map<string, TFile>();
  private readonly syncingFiles = new Set<string>();
  private readonly pollingFiles = new Set<string>();
  private isFlushing = false;
  private cancelled = false;
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
    this.cancelled = true;
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

  isSynced(file: TFile): boolean {
    const cached = this.syncCache[file.path];
    return (
      cached !== undefined &&
      cached.mtime === file.stat.mtime &&
      (cached.status === undefined || cached.status === 'synced')
    );
  }

  isSyncing(file: TFile): boolean {
    return this.syncingFiles.has(file.path);
  }

  async pollSyncJobForFile(file: TFile): Promise<void> {
    const cached = this.syncCache[file.path];
    if (
      !cached?.syncJobId ||
      cached.mtime !== file.stat.mtime ||
      (cached.status !== 'accepted' && cached.status !== 'processing') ||
      !this.shouldPollSyncJob(file.path) ||
      this.pollingFiles.has(file.path)
    ) {
      return;
    }

    this.pollingFiles.add(file.path);
    try {
      await this.waitForSyncJob(file.path, cached.syncJobId, cached.mtime);
    } finally {
      this.pollingFiles.delete(file.path);
    }
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
    this.syncingFiles.add(file.path);
    this.options.onSyncStart?.(file.path);
    try {
      const mtimeAtRead = file.stat.mtime;
      const content = await this.options.vault.read(file);
      const upload = await this.api.uploadSource({
        externalSourceId: file.path,
        content,
      });
      if (!upload.syncJobId) {
        this.syncCache[file.path] = {
          mtime: mtimeAtRead,
          syncedAt: Date.now(),
          sourceId: upload.sourceId,
          fingerprint: upload.fingerprint,
          status: 'synced',
        };
        await this.options.saveSyncCache();
        return;
      }

      this.syncCache[file.path] = {
        mtime: mtimeAtRead,
        acceptedAt: Date.now(),
        sourceId: upload.sourceId,
        syncJobId: upload.syncJobId,
        fingerprint: upload.fingerprint,
        status: 'accepted',
      };
      await this.options.saveSyncCache();
      this.options.onSyncStateChanged?.(file.path);
      if (this.shouldPollSyncJob(file.path)) {
        void this.pollSyncJobForFile(file).catch((error: unknown) => {
          console.error(
            `[Sheska] Sync job polling failed for "${file.path}":`,
            error,
          );
        });
      }
    } finally {
      this.syncingFiles.delete(file.path);
      this.options.onSyncFinished?.(file.path);
    }
  }

  private async waitForSyncJob(
    path: string,
    syncJobId: string,
    mtime: number,
  ): Promise<void> {
    const initialDelay = this.options.syncJobPollInitialDelayMs ?? 2_000;
    const interval = this.options.syncJobPollIntervalMs ?? 5_000;
    const timeout = this.options.syncJobPollTimeoutMs ?? 120_000;
    const deadline = Date.now() + timeout;
    await this.delay(initialDelay);

    while (
      !this.cancelled &&
      this.shouldPollSyncJob(path) &&
      Date.now() <= deadline
    ) {
      const job = await this.api.getSyncJob(syncJobId);
      const cached = this.syncCache[path];
      if (!cached || cached.syncJobId !== syncJobId || cached.mtime !== mtime) {
        return;
      }

      if (job.status === 'completed') {
        this.syncCache[path] = {
          ...cached,
          status: 'synced',
          syncedAt: Date.now(),
        };
        await this.options.saveSyncCache();
        this.options.onSyncStateChanged?.(path);
        return;
      }
      if (job.status === 'failed') {
        this.syncCache[path] = { ...cached, status: 'failed' };
        await this.options.saveSyncCache();
        this.options.onSyncStateChanged?.(path);
        throw new Error(`Sheska sync job failed: ${syncJobId}`);
      }

      this.syncCache[path] = {
        ...cached,
        status: job.status === 'processing' ? 'processing' : 'accepted',
      };
      await this.options.saveSyncCache();
      this.options.onSyncStateChanged?.(path);
      await this.delay(interval);
    }

    if (this.cancelled || !this.shouldPollSyncJob(path)) return;

    const cached = this.syncCache[path];
    if (cached?.syncJobId === syncJobId && cached.mtime === mtime) {
      this.syncCache[path] = { ...cached, status: 'failed' };
      await this.options.saveSyncCache();
      this.options.onSyncStateChanged?.(path);
    }
    throw new Error(`Timed out waiting for Sheska sync job: ${syncJobId}`);
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  private shouldPollSyncJob(path: string): boolean {
    return this.options.shouldPollSyncJob?.(path) ?? true;
  }

  private async uploadIfChanged(file: TFile): Promise<void> {
    if (!this.isInAutoSyncDirectory(file.path)) return;
    if (this.isSynced(file)) return;
    const cached = this.syncCache[file.path];
    if (
      cached?.mtime === file.stat.mtime &&
      cached.syncJobId &&
      (cached.status === 'accepted' || cached.status === 'processing')
    ) {
      if (this.shouldPollSyncJob(file.path)) {
        try {
          await this.pollSyncJobForFile(file);
        } catch (err) {
          console.error(
            `[Sheska] Sync job polling failed for "${file.path}":`,
            err,
          );
        }
      }
      return;
    }
    try {
      await this.uploadFileCore(file);
    } catch (err) {
      console.error(`[Sheska] Auto-sync failed for "${file.path}":`, err);
    }
  }

  private isInAutoSyncDirectory(filePath: string): boolean {
    const directories = this.settings.autoSyncDirectories
      .split(',')
      .map((directory) => directory.trim().replace(/^\/+|\/+$/g, ''))
      .filter(Boolean);

    if (directories.length === 0) return true;
    return directories.some((directory) =>
      filePath.startsWith(`${directory}/`),
    );
  }
}
