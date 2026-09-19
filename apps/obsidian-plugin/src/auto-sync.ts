import { TFile, debounce } from 'obsidian';
import type { Debouncer, TAbstractFile, Vault } from 'obsidian';
import { isRetryableApiError } from '@/api/client';
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
  maxAutoRetries?: number;
}

export const AUTO_RETRY_BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000];
export const DEFAULT_MAX_AUTO_RETRIES = AUTO_RETRY_BACKOFF_MS.length;

export class AutoSyncService {
  private api: SheskaApiClient;
  private settings: SheskaSettings;
  private syncCache: SyncCache;
  private readonly dirtyFiles = new Map<string, TFile>();
  private readonly syncingFiles = new Set<string>();
  private readonly pollingFiles = new Set<string>();
  private readonly reconcilingFiles = new Set<string>();
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

  resetSyncCache(): void {
    this.syncCache = {};
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
      await this.uploadChangedDuringSweep(file);
    }
  }

  async runReconcile(): Promise<void> {
    for (const path of Object.keys(this.syncCache)) {
      const file = this.options.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) await this.reconcileCachedFile(file);
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
      (cached.status !== 'accepted' &&
        cached.status !== 'processing' &&
        cached.status !== 'unknown') ||
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

  private async uploadFileCore(
    file: TFile,
    retryCount?: number,
  ): Promise<void> {
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
        ...(retryCount === undefined ? {} : { retryCount }),
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
        this.markSynced(path, cached);
        await this.options.saveSyncCache();
        this.options.onSyncStateChanged?.(path);
        return;
      }
      if (job.status === 'failed') {
        await this.recordServerFailure(path, cached);
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
      this.syncCache[path] = { ...cached, status: 'unknown' };
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
      (cached.status === 'accepted' ||
        cached.status === 'processing' ||
        cached.status === 'unknown')
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
    if (cached?.mtime === file.stat.mtime) return;
    try {
      await this.uploadFileCore(file);
    } catch (err) {
      console.error(`[Sheska] Auto-sync failed for "${file.path}":`, err);
      await this.recordUploadFailure(file, err);
    }
  }

  private async uploadChangedDuringSweep(file: TFile): Promise<void> {
    if (!this.isInAutoSyncDirectory(file.path)) return;
    const cached = this.syncCache[file.path];
    if (cached?.mtime === file.stat.mtime) return;
    if (this.syncingFiles.has(file.path)) return;
    try {
      await this.uploadFileCore(file);
    } catch (err) {
      console.error(`[Sheska] Auto-sync failed for "${file.path}":`, err);
      await this.recordUploadFailure(file, err);
    }
  }

  private async reconcileCachedFile(file: TFile): Promise<void> {
    if (!this.isInAutoSyncDirectory(file.path)) return;
    if (!this.isInAutoSyncDirectory(file.path)) return;
    if (
      this.syncingFiles.has(file.path) ||
      this.pollingFiles.has(file.path) ||
      this.reconcilingFiles.has(file.path)
    ) {
      return;
    }

    this.reconcilingFiles.add(file.path);
    try {
      await this.reconcileCachedFileCore(file);
    } finally {
      this.reconcilingFiles.delete(file.path);
    }
  }

  private async reconcileCachedFileCore(file: TFile): Promise<void> {
    const cached = this.syncCache[file.path];
    if (!cached || cached.mtime !== file.stat.mtime) return;
    if (cached.status === 'failed' && cached.nextRetryAt !== undefined) {
      if (Date.now() < cached.nextRetryAt) return;
      try {
        await this.retryFailedSync(file, cached);
      } catch (err) {
        console.error(
          `[Sheska] Auto-sync retry failed for "${file.path}":`,
          err,
        );
      }
      return;
    }
    if (
      !cached.syncJobId ||
      cached.status === undefined ||
      cached.status === 'synced' ||
      cached.status === 'needs-attention'
    ) {
      return;
    }

    try {
      await this.reconcileSyncJob(file, cached.syncJobId, cached.mtime);
    } catch (err) {
      console.error(
        `[Sheska] Sync job reconciliation failed for "${file.path}":`,
        err,
      );
    }
  }

  private async reconcileSyncJob(
    file: TFile,
    syncJobId: string,
    mtime: number,
  ): Promise<void> {
    const job = await this.api.getSyncJob(syncJobId);
    const cached = this.syncCache[file.path];
    if (!cached || cached.syncJobId !== syncJobId || cached.mtime !== mtime) {
      return;
    }

    if (job.status === 'completed') {
      this.markSynced(file.path, cached);
      await this.options.saveSyncCache();
      this.options.onSyncStateChanged?.(file.path);
      return;
    }
    if (job.status === 'failed') {
      await this.retryFailedSync(file, cached);
      return;
    }

    const status = job.status === 'processing' ? 'processing' : 'accepted';
    if (cached.status === status) return;
    this.syncCache[file.path] = { ...cached, status };
    await this.options.saveSyncCache();
    this.options.onSyncStateChanged?.(file.path);
  }

  private async retryFailedSync(
    file: TFile,
    cached: SyncCache[string],
  ): Promise<void> {
    const retryCount = cached.retryCount ?? 0;
    const maxAutoRetries =
      this.options.maxAutoRetries ?? DEFAULT_MAX_AUTO_RETRIES;
    if (retryCount >= maxAutoRetries) {
      await this.recordServerFailure(file.path, cached);
      return;
    }

    const now = Date.now();
    if (cached.status !== 'failed' || cached.nextRetryAt === undefined) {
      await this.recordServerFailure(file.path, cached);
      return;
    }
    if (now < cached.nextRetryAt) return;

    const nextRetryCount = retryCount + 1;
    this.syncCache[file.path] = {
      ...cached,
      status: 'retrying',
      retryCount: nextRetryCount,
      nextRetryAt: undefined,
    };
    await this.options.saveSyncCache();
    this.options.onSyncStateChanged?.(file.path);

    try {
      await this.uploadFileCore(file, nextRetryCount);
    } catch (error) {
      const current = this.syncCache[file.path];
      if (current?.mtime === cached.mtime) {
        this.syncCache[file.path] = {
          ...current,
          status:
            nextRetryCount >= maxAutoRetries ? 'needs-attention' : 'failed',
          nextRetryAt:
            nextRetryCount >= maxAutoRetries
              ? undefined
              : Date.now() + this.retryDelayMs(nextRetryCount),
        };
        await this.options.saveSyncCache();
        this.options.onSyncStateChanged?.(file.path);
      }
      throw error;
    }
  }

  private async recordUploadFailure(
    file: TFile,
    error: unknown,
  ): Promise<void> {
    const retryCount = this.syncCache[file.path]?.retryCount ?? 0;
    const maxAutoRetries =
      this.options.maxAutoRetries ?? DEFAULT_MAX_AUTO_RETRIES;
    const exhausted =
      !isRetryableApiError(error) || retryCount >= maxAutoRetries;

    this.syncCache[file.path] = {
      mtime: file.stat.mtime,
      status: exhausted ? 'needs-attention' : 'failed',
      retryCount,
      nextRetryAt: exhausted
        ? undefined
        : Date.now() + this.retryDelayMs(retryCount),
    };
    await this.options.saveSyncCache();
    this.options.onSyncStateChanged?.(file.path);
  }

  private retryDelayMs(retryCount: number): number {
    return AUTO_RETRY_BACKOFF_MS[
      Math.min(retryCount, AUTO_RETRY_BACKOFF_MS.length - 1)
    ];
  }

  private async recordServerFailure(
    path: string,
    cached: SyncCache[string],
  ): Promise<void> {
    const retryCount = cached.retryCount ?? 0;
    const maxAutoRetries =
      this.options.maxAutoRetries ?? DEFAULT_MAX_AUTO_RETRIES;
    const exhausted = retryCount >= maxAutoRetries;
    this.syncCache[path] = {
      ...cached,
      status: exhausted ? 'needs-attention' : 'failed',
      nextRetryAt: exhausted
        ? undefined
        : Date.now() + this.retryDelayMs(retryCount),
    };
    await this.options.saveSyncCache();
    this.options.onSyncStateChanged?.(path);
  }

  private markSynced(path: string, cached: SyncCache[string]): void {
    this.syncCache[path] = {
      mtime: cached.mtime,
      syncedAt: Date.now(),
      sourceId: cached.sourceId,
      fingerprint: cached.fingerprint,
      status: 'synced',
    };
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
