import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TAbstractFile, TFile } from '../__mocks__/obsidian';
import { SheskaApiError } from '@/api/client';
import type { SheskaApiClient } from '@/api/client';
import { AutoSyncService } from '@/auto-sync';
import { DEFAULT_SETTINGS } from '@/settings';
import type { SheskaSettings } from '@/settings';
import type { SyncCache } from '@/storage';
import type {
  CachedMetadata,
  TAbstractFile as ObsidianAbstractFile,
  TFile as ObsidianFile,
} from 'obsidian';

function asObsidianFile(file: TFile): ObsidianFile {
  return file as unknown as ObsidianFile;
}

function asObsidianAbstractFile(
  file: TAbstractFile | TFile,
): ObsidianAbstractFile {
  return file as unknown as ObsidianAbstractFile;
}

function syncTargetMetadataCache() {
  return {
    getFileCache: vi.fn(
      (_file: ObsidianFile): CachedMetadata => ({
        frontmatter: { sheska: true },
      }),
    ),
  };
}

function withFrontmatter(
  metadataCache: ReturnType<typeof syncTargetMetadataCache>,
  frontmatterByPath: Record<string, Record<string, unknown> | undefined>,
) {
  metadataCache.getFileCache.mockImplementation((file) => ({
    frontmatter: frontmatterByPath[file.path],
  }));
}

function makeService(
  settings: Partial<SheskaSettings> = {},
  syncCache: SyncCache = {},
  shouldPollSyncJob?: (path: string) => boolean,
  serviceOptions: {
    syncJobPollInitialDelayMs?: number;
    syncJobPollIntervalMs?: number;
    syncJobPollTimeoutMs?: number;
    maxAutoRetries?: number;
  } = {},
) {
  const api = {
    uploadSource: vi.fn().mockResolvedValue({
      sourceId: 'source-1',
      externalSourceId: 'note.md',
      fingerprint: 'fingerprint',
    }),
    getSyncJob: vi.fn(),
  };
  const vault = {
    read: vi.fn().mockResolvedValue('content'),
    getMarkdownFiles: vi.fn().mockReturnValue([]),
    getAbstractFileByPath: vi.fn().mockReturnValue(null),
  };
  const metadataCache = syncTargetMetadataCache();
  const saveSyncCache = vi.fn().mockResolvedValue(undefined);
  const service = new AutoSyncService({
    vault: vault as never,
    metadataCache,
    api: api as unknown as SheskaApiClient,
    settings: {
      ...DEFAULT_SETTINGS,
      ...settings,
    },
    syncCache,
    saveSyncCache,
    shouldPollSyncJob,
    ...serviceOptions,
  });
  return { api, metadataCache, saveSyncCache, service, vault };
}

describe('AutoSyncService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('manual upload uploads the file and updates the sync cache', async () => {
    const syncCache: SyncCache = {};
    const { api, saveSyncCache, service, vault } = makeService({}, syncCache);
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });

    await service.uploadFile(asObsidianFile(file));

    expect(vault.read).toHaveBeenCalledWith(file);
    expect(api.uploadSource).toHaveBeenCalledWith({
      externalSourceId: 'note.md',
      content: 'content',
    });
    expect(syncCache['note.md']).toMatchObject({ mtime: 123 });
    expect(saveSyncCache).toHaveBeenCalledOnce();
  });

  it('polls a created sync job and marks the file synced only after completion', async () => {
    const syncCache: SyncCache = {};
    const { api, saveSyncCache, service } = makeService({}, syncCache);
    api.uploadSource.mockResolvedValue({
      sourceId: 'source-1',
      externalSourceId: 'note.md',
      fingerprint: 'fingerprint',
      syncJobId: 'job-1',
    });
    api.getSyncJob
      .mockResolvedValueOnce({ status: 'processing' })
      .mockResolvedValueOnce({ status: 'completed' });
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });

    await service.uploadFile(asObsidianFile(file));
    await vi.advanceTimersByTimeAsync(2_000);
    expect(syncCache['note.md']).toMatchObject({
      status: 'processing',
      syncJobId: 'job-1',
    });
    expect(service.isSynced(asObsidianFile(file))).toBe(false);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(api.getSyncJob).toHaveBeenCalledTimes(2);
    expect(syncCache['note.md']).toMatchObject({ status: 'synced' });
    expect(saveSyncCache).toHaveBeenCalledTimes(3);
  });

  it('records a failed sync job without failing the accepted upload', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const syncCache: SyncCache = {};
    const { api, service } = makeService({}, syncCache);
    api.uploadSource.mockResolvedValue({
      sourceId: 'source-1',
      externalSourceId: 'note.md',
      fingerprint: 'fingerprint',
      syncJobId: 'job-1',
    });
    api.getSyncJob.mockResolvedValue({ status: 'failed' });
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });

    await expect(
      service.uploadFile(asObsidianFile(file)),
    ).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(2_000);

    expect(syncCache['note.md']).toMatchObject({
      status: 'failed',
      nextRetryAt: Date.now() + 60_000,
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('does not poll an uploaded file when it is not the active polling target', async () => {
    const syncCache: SyncCache = {};
    const { api, service } = makeService({}, syncCache, () => false);
    api.uploadSource.mockResolvedValue({
      sourceId: 'source-1',
      externalSourceId: 'note.md',
      fingerprint: 'fingerprint',
      syncJobId: 'job-1',
    });
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });

    await service.uploadFile(asObsidianFile(file));
    await vi.advanceTimersByTimeAsync(10_000);

    expect(api.getSyncJob).not.toHaveBeenCalled();
    expect(syncCache['note.md']).toMatchObject({ status: 'accepted' });
  });

  it('reconciles an inactive pending job without re-uploading it', async () => {
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
    const { api, service, vault } = makeService(
      {},
      {
        'note.md': {
          mtime: 123,
          acceptedAt: 1,
          syncJobId: 'job-1',
          status: 'accepted',
        },
      },
      () => false,
    );
    vault.getAbstractFileByPath.mockReturnValue(file);
    api.getSyncJob.mockResolvedValue({ status: 'waiting' });

    await service.runReconcile();

    expect(api.uploadSource).not.toHaveBeenCalled();
    expect(api.getSyncJob).toHaveBeenCalledWith('job-1');
  });

  it('marks an inactive job synced when reconciliation finds it completed', async () => {
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
    const syncCache: SyncCache = {
      'note.md': {
        mtime: 123,
        acceptedAt: 1,
        syncJobId: 'job-1',
        status: 'accepted',
      },
    };
    const { api, service, vault } = makeService({}, syncCache, () => false);
    vault.getAbstractFileByPath.mockReturnValue(file);
    api.getSyncJob.mockResolvedValue({ status: 'completed' });

    await service.runReconcile();
    await service.runReconcile();

    expect(api.uploadSource).not.toHaveBeenCalled();
    expect(api.getSyncJob).toHaveBeenCalledOnce();
    expect(syncCache['note.md']).toMatchObject({ status: 'synced' });
    expect(syncCache['note.md'].syncJobId).toBeUndefined();
  });

  it('library.sync-9: creates a new sync job one minute after reconciliation finds an initial failure', async () => {
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
    const syncCache: SyncCache = {
      'note.md': {
        mtime: 123,
        acceptedAt: 1,
        syncJobId: 'job-1',
        status: 'accepted',
      },
    };
    const { api, service, vault } = makeService({}, syncCache, () => false);
    vault.getAbstractFileByPath.mockReturnValue(file);
    api.getSyncJob.mockResolvedValue({ status: 'failed' });
    api.uploadSource.mockResolvedValue({
      sourceId: 'source-1',
      externalSourceId: 'note.md',
      fingerprint: 'fingerprint',
      syncJobId: 'job-2',
    });

    await service.runReconcile();

    expect(api.uploadSource).not.toHaveBeenCalled();
    expect(syncCache['note.md']).toMatchObject({
      status: 'failed',
      nextRetryAt: Date.now() + 60_000,
    });

    await vi.advanceTimersByTimeAsync(60_000);
    await service.runReconcile();

    expect(api.uploadSource).toHaveBeenCalledOnce();
    expect(syncCache['note.md']).toMatchObject({
      status: 'accepted',
      syncJobId: 'job-2',
      retryCount: 1,
    });
  });

  it.each([
    { retryCount: 1, delayMs: 5 * 60_000 },
    { retryCount: 2, delayMs: 30 * 60_000 },
  ])(
    'waits $delayMs ms before retrying after $retryCount previous retries',
    async ({ retryCount, delayMs }) => {
      const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
      const syncCache: SyncCache = {
        'note.md': {
          mtime: 123,
          syncJobId: `job-${retryCount}`,
          status: 'accepted',
          retryCount,
        },
      };
      const { api, service, vault } = makeService({}, syncCache, () => false);
      vault.getAbstractFileByPath.mockReturnValue(file);
      api.getSyncJob.mockResolvedValue({ status: 'failed' });
      api.uploadSource.mockResolvedValue({
        sourceId: 'source-1',
        externalSourceId: 'note.md',
        fingerprint: 'fingerprint',
        syncJobId: `job-${retryCount + 1}`,
      });

      await service.runReconcile();
      await vi.advanceTimersByTimeAsync(delayMs - 1);
      await service.runReconcile();
      expect(api.uploadSource).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      await service.runReconcile();

      expect(api.getSyncJob).toHaveBeenCalledOnce();
      expect(api.uploadSource).toHaveBeenCalledOnce();
      expect(syncCache['note.md']).toMatchObject({
        status: 'accepted',
        retryCount: retryCount + 1,
      });
    },
  );

  it('records a retryable upload failure so the sweep stops re-uploading it', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
    const syncCache: SyncCache = {};
    const { api, service, vault } = makeService({}, syncCache);
    vault.getMarkdownFiles.mockReturnValue([file]);
    api.uploadSource.mockRejectedValue(
      new SheskaApiError(503, 'Service Unavailable', ''),
    );

    await service.runSweep();

    expect(syncCache['note.md']).toEqual({
      mtime: 123,
      status: 'failed',
      retryCount: 0,
      nextRetryAt: Date.now() + 60_000,
    });

    await service.runSweep();

    expect(api.uploadSource).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });

  it('library.sync-9: keeps an upload the server rejects scheduled for another retry', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
    const syncCache: SyncCache = {};
    const { api, service, vault } = makeService({}, syncCache);
    vault.getMarkdownFiles.mockReturnValue([file]);
    api.uploadSource.mockRejectedValue(
      new SheskaApiError(400, 'Bad Request', ''),
    );

    await service.runSweep();

    expect(syncCache['note.md']).toMatchObject({ status: 'failed' });
    expect(syncCache['note.md'].nextRetryAt).toEqual(expect.any(Number));
    errorSpy.mockRestore();
  });

  it('library.sync-9: retries a failed upload once its backoff elapses', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
    const syncCache: SyncCache = {};
    const { api, service, vault } = makeService({}, syncCache, () => false);
    vault.getMarkdownFiles.mockReturnValue([file]);
    vault.getAbstractFileByPath.mockReturnValue(file);
    api.uploadSource.mockRejectedValueOnce(
      new SheskaApiError(503, 'Service Unavailable', ''),
    );

    await service.runSweep();
    await vi.advanceTimersByTimeAsync(60_000 - 1);
    await service.runReconcile();

    expect(api.uploadSource).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(1);
    await service.runReconcile();

    expect(api.uploadSource).toHaveBeenCalledTimes(2);
    expect(syncCache['note.md']).toMatchObject({ status: 'synced' });
    errorSpy.mockRestore();
  });

  it('library.sync-9: keeps retrying an upload past the old attempt limit', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const file = new TFile('note.md', { ctime: 0, mtime: 200, size: 1 });
    const syncCache: SyncCache = {
      'note.md': { mtime: 123, status: 'failed', retryCount: 3 },
    };
    const { api, service, vault } = makeService({}, syncCache);
    vault.getMarkdownFiles.mockReturnValue([file]);
    api.uploadSource.mockRejectedValue(
      new SheskaApiError(503, 'Service Unavailable', ''),
    );

    await service.runSweep();

    expect(syncCache['note.md']).toMatchObject({
      mtime: 200,
      status: 'failed',
    });
    expect(syncCache['note.md'].nextRetryAt).toEqual(expect.any(Number));
    errorSpy.mockRestore();
  });

  it('library.sync-9: schedules another retry when the server reports a failed sync job', async () => {
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
    const syncCache: SyncCache = {
      'note.md': {
        mtime: 123,
        acceptedAt: 1,
        syncJobId: 'job-3',
        status: 'accepted',
        retryCount: 3,
      },
    };
    const { api, service, vault } = makeService({}, syncCache, () => false);
    vault.getAbstractFileByPath.mockReturnValue(file);
    api.getSyncJob.mockResolvedValue({ status: 'failed' });

    await service.runReconcile();
    await service.runReconcile();

    expect(api.uploadSource).not.toHaveBeenCalled();
    expect(api.getSyncJob).toHaveBeenCalledOnce();
    expect(syncCache['note.md']).toMatchObject({
      status: 'failed',
      retryCount: 3,
    });
    expect(syncCache['note.md'].nextRetryAt).toEqual(expect.any(Number));
  });

  it('keeps the cached state when sweep reconciliation cannot reach the API', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
    const syncCache: SyncCache = {
      'note.md': {
        mtime: 123,
        syncJobId: 'job-1',
        status: 'accepted',
      },
    };
    const { api, service, vault } = makeService({}, syncCache, () => false);
    vault.getAbstractFileByPath.mockReturnValue(file);
    api.getSyncJob.mockRejectedValue(new Error('offline'));

    await service.runReconcile();

    expect(api.uploadSource).not.toHaveBeenCalled();
    expect(syncCache['note.md']).toMatchObject({ status: 'accepted' });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('manual upload resets an accumulated automatic retry count', async () => {
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
    const syncCache: SyncCache = {
      'note.md': {
        mtime: 123,
        syncJobId: 'job-3',
        status: 'failed',
        retryCount: 3,
      },
    };
    const { api, service } = makeService({}, syncCache, () => false);
    api.uploadSource.mockResolvedValue({
      sourceId: 'source-1',
      externalSourceId: 'note.md',
      fingerprint: 'fingerprint',
      syncJobId: 'job-4',
    });

    await service.uploadFile(asObsidianFile(file));

    expect(syncCache['note.md']).toMatchObject({
      status: 'accepted',
      syncJobId: 'job-4',
    });
    expect(syncCache['note.md'].retryCount).toBeUndefined();
  });

  it('records an unknown status when active polling times out', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const syncCache: SyncCache = {};
    const { api, service } = makeService({}, syncCache, undefined, {
      syncJobPollInitialDelayMs: 0,
      syncJobPollIntervalMs: 1,
      syncJobPollTimeoutMs: 0,
    });
    api.uploadSource.mockResolvedValue({
      sourceId: 'source-1',
      externalSourceId: 'note.md',
      fingerprint: 'fingerprint',
      syncJobId: 'job-1',
    });
    api.getSyncJob.mockResolvedValue({ status: 'waiting' });
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });

    await service.uploadFile(asObsidianFile(file));
    await vi.advanceTimersByTimeAsync(1);

    expect(syncCache['note.md']).toMatchObject({ status: 'unknown' });
    errorSpy.mockRestore();
  });

  it('resumes polling a cached job when its note becomes active', async () => {
    let active = false;
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
    const syncCache: SyncCache = {
      'note.md': {
        mtime: 123,
        acceptedAt: 1,
        syncJobId: 'job-1',
        status: 'accepted',
      },
    };
    const { api, service } = makeService({}, syncCache, () => active);
    api.getSyncJob.mockResolvedValue({ status: 'completed' });

    await service.pollSyncJobForFile(asObsidianFile(file));
    expect(api.getSyncJob).not.toHaveBeenCalled();

    active = true;
    const polling = service.pollSyncJobForFile(asObsidianFile(file));
    await vi.advanceTimersByTimeAsync(2_000);
    await polling;

    expect(api.getSyncJob).toHaveBeenCalledWith('job-1');
    expect(syncCache['note.md']).toMatchObject({ status: 'synced' });
  });

  it('coalesces changed files into one debounced flush', async () => {
    const { api, service } = makeService({ autoSyncDebounceSeconds: 5 });
    const fileA = new TFile('a.md', { ctime: 0, mtime: 100, size: 1 });
    const fileB = new TFile('b.md', { ctime: 0, mtime: 200, size: 1 });

    service.onVaultFileChanged(asObsidianAbstractFile(fileA));
    service.onVaultFileChanged(asObsidianAbstractFile(fileB));
    await vi.advanceTimersByTimeAsync(5000);

    expect(
      api.uploadSource.mock.calls.map(
        ([body]) => (body as { externalSourceId: string }).externalSourceId,
      ),
    ).toEqual(['a.md', 'b.md']);
  });

  it('library.sync-10: ignores vault changes when auto-sync is disabled', async () => {
    const { api, service } = makeService({
      autoSyncEnabled: false,
      autoSyncDebounceSeconds: 1,
    });

    service.onVaultFileChanged(
      asObsidianAbstractFile(
        new TFile('note.md', { ctime: 0, mtime: 100, size: 1 }),
      ),
    );
    await vi.advanceTimersByTimeAsync(1000);

    expect(api.uploadSource).not.toHaveBeenCalled();
  });

  it('ignores non-file vault changes', async () => {
    const { api, service } = makeService({ autoSyncDebounceSeconds: 1 });

    service.onVaultFileChanged(
      asObsidianAbstractFile(new TAbstractFile('folder')),
    );
    await vi.advanceTimersByTimeAsync(1000);

    expect(api.uploadSource).not.toHaveBeenCalled();
  });

  it('library.source-6: uploads vault changes only from notes whose frontmatter sheska is the boolean true', async () => {
    const { api, metadataCache, service } = makeService({
      autoSyncDebounceSeconds: 1,
    });
    withFrontmatter(metadataCache, {
      'target.md': { sheska: true },
      'string.md': { sheska: 'true' },
      'yes.md': { sheska: 'yes' },
      'number.md': { sheska: 1 },
      'opted-out.md': { sheska: false },
    });

    for (const path of [
      'target.md',
      'string.md',
      'yes.md',
      'number.md',
      'opted-out.md',
      'no-frontmatter.md',
    ]) {
      service.onVaultFileChanged(
        asObsidianAbstractFile(
          new TFile(path, { ctime: 0, mtime: 100, size: 1 }),
        ),
      );
    }
    await vi.advanceTimersByTimeAsync(1000);

    expect(
      api.uploadSource.mock.calls.map(
        ([body]) => (body as { externalSourceId: string }).externalSourceId,
      ),
    ).toEqual(['target.md']);
  });

  it('skips changed-file uploads when the cached mtime matches', async () => {
    const { api, service } = makeService(
      { autoSyncDebounceSeconds: 1 },
      { 'note.md': { mtime: 100, syncedAt: 1 } },
    );

    service.onVaultFileChanged(
      asObsidianAbstractFile(
        new TFile('note.md', { ctime: 0, mtime: 100, size: 1 }),
      ),
    );
    await vi.advanceTimersByTimeAsync(1000);

    expect(api.uploadSource).not.toHaveBeenCalled();
  });

  it('sweeps only markdown files whose mtime changed since the cache', async () => {
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
    const { api, service, vault } = makeService(
      {},
      { 'unchanged.md': { mtime: 100, syncedAt: 1 } },
    );
    vault.getMarkdownFiles.mockReturnValue([unchanged, changed]);

    await service.runSweep();

    expect(api.uploadSource).toHaveBeenCalledOnce();
    expect(api.uploadSource).toHaveBeenCalledWith({
      externalSourceId: 'changed.md',
      content: 'content',
    });
  });

  it('library.source-6: sweeps only markdown files whose frontmatter sheska is true', async () => {
    const target = new TFile('Journal/today.md', {
      ctime: 0,
      mtime: 100,
      size: 1,
    });
    const other = new TFile('Archive/old.md', {
      ctime: 0,
      mtime: 100,
      size: 1,
    });
    const { api, metadataCache, service, vault } = makeService();
    withFrontmatter(metadataCache, { 'Journal/today.md': { sheska: true } });
    vault.getMarkdownFiles.mockReturnValue([target, other]);

    await service.runSweep();

    expect(api.uploadSource).toHaveBeenCalledOnce();
    expect(api.uploadSource).toHaveBeenCalledWith({
      externalSourceId: 'Journal/today.md',
      content: 'content',
    });
  });

  it('library.source-6: stops retrying a failed note once its frontmatter no longer has sheska true', async () => {
    const file = new TFile('note.md', { ctime: 0, mtime: 100, size: 1 });
    const { api, metadataCache, service, vault } = makeService(
      {},
      {
        'note.md': {
          mtime: 100,
          status: 'failed',
          retryCount: 0,
          nextRetryAt: 0,
        },
      },
    );
    withFrontmatter(metadataCache, {});
    vault.getAbstractFileByPath.mockReturnValue(file);

    await service.runReconcile();

    expect(api.uploadSource).not.toHaveBeenCalled();
  });

  it('continues a debounced batch after one upload fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { api, service } = makeService({ autoSyncDebounceSeconds: 1 });
    api.uploadSource
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        sourceId: 'source-2',
        externalSourceId: 'b.md',
        fingerprint: 'fingerprint',
      });

    service.onVaultFileChanged(
      asObsidianAbstractFile(
        new TFile('a.md', { ctime: 0, mtime: 100, size: 1 }),
      ),
    );
    service.onVaultFileChanged(
      asObsidianAbstractFile(
        new TFile('b.md', { ctime: 0, mtime: 200, size: 1 }),
      ),
    );
    await vi.advanceTimersByTimeAsync(1000);

    expect(api.uploadSource).toHaveBeenCalledTimes(2);
    expect(service.getSyncCache()['a.md']).toMatchObject({
      mtime: 100,
      status: 'failed',
    });
    expect(service.getSyncCache()).toHaveProperty('b.md');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('library.sync-3: captures mtime before reading content so concurrent edits are not lost', async () => {
    const { service, vault } = makeService();
    const file = new TFile('note.md', { ctime: 0, mtime: 100, size: 1 });
    vault.read.mockImplementation(() => {
      file.stat.mtime = 999;
      return Promise.resolve('content');
    });

    await service.uploadFile(asObsidianFile(file));

    expect(service.getSyncCache()['note.md']?.mtime).toBe(100);
  });

  it('isSynced reports true only when the cached mtime matches the file', () => {
    const { service } = makeService(
      {},
      { 'note.md': { mtime: 100, syncedAt: 1 } },
    );

    expect(
      service.isSynced(
        asObsidianFile(new TFile('note.md', { ctime: 0, mtime: 100, size: 1 })),
      ),
    ).toBe(true);
    expect(
      service.isSynced(
        asObsidianFile(new TFile('note.md', { ctime: 0, mtime: 200, size: 1 })),
      ),
    ).toBe(false);
    expect(
      service.isSynced(
        asObsidianFile(
          new TFile('other.md', { ctime: 0, mtime: 100, size: 1 }),
        ),
      ),
    ).toBe(false);
  });

  it('calls onSyncFinished with the path after a successful upload', async () => {
    const onSyncFinished = vi.fn();
    const api = {
      uploadSource: vi.fn().mockResolvedValue({
        sourceId: 'source-1',
        externalSourceId: 'note.md',
        fingerprint: 'fingerprint',
      }),
    };
    const vault = {
      read: vi.fn().mockResolvedValue('content'),
      getMarkdownFiles: vi.fn().mockReturnValue([]),
    };
    const service = new AutoSyncService({
      vault: vault as never,
      metadataCache: syncTargetMetadataCache(),
      api: api as unknown as SheskaApiClient,
      settings: DEFAULT_SETTINGS,
      syncCache: {},
      saveSyncCache: vi.fn().mockResolvedValue(undefined),
      onSyncFinished,
    });

    await service.uploadFile(
      asObsidianFile(new TFile('note.md', { ctime: 0, mtime: 100, size: 1 })),
    );

    expect(onSyncFinished).toHaveBeenCalledWith('note.md');
  });

  it('calls onSyncStart with the path before the upload begins', async () => {
    const onSyncStart = vi.fn();
    const api = {
      uploadSource: vi.fn().mockResolvedValue({
        sourceId: 'source-1',
        externalSourceId: 'note.md',
        fingerprint: 'fingerprint',
      }),
    };
    const vault = {
      read: vi.fn().mockResolvedValue('content'),
      getMarkdownFiles: vi.fn().mockReturnValue([]),
    };
    const service = new AutoSyncService({
      vault: vault as never,
      metadataCache: syncTargetMetadataCache(),
      api: api as unknown as SheskaApiClient,
      settings: DEFAULT_SETTINGS,
      syncCache: {},
      saveSyncCache: vi.fn().mockResolvedValue(undefined),
      onSyncStart,
    });

    await service.uploadFile(
      asObsidianFile(new TFile('note.md', { ctime: 0, mtime: 100, size: 1 })),
    );

    expect(onSyncStart).toHaveBeenCalledWith('note.md');
  });

  it('still calls onSyncFinished when the upload fails, so callers can clear in-flight state', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSyncFinished = vi.fn();
    const api = {
      uploadSource: vi.fn().mockRejectedValue(new Error('boom')),
    };
    const vault = {
      read: vi.fn().mockResolvedValue('content'),
      getMarkdownFiles: vi.fn().mockReturnValue([]),
    };
    const service = new AutoSyncService({
      vault: vault as never,
      metadataCache: syncTargetMetadataCache(),
      api: api as unknown as SheskaApiClient,
      settings: {
        ...DEFAULT_SETTINGS,
        autoSyncDebounceSeconds: 1,
      },
      syncCache: {},
      saveSyncCache: vi.fn().mockResolvedValue(undefined),
      onSyncFinished,
    });

    service.onVaultFileChanged(
      asObsidianAbstractFile(
        new TFile('note.md', { ctime: 0, mtime: 100, size: 1 }),
      ),
    );
    await vi.advanceTimersByTimeAsync(1000);

    expect(onSyncFinished).toHaveBeenCalledWith('note.md');
    errorSpy.mockRestore();
  });

  it('isSyncing reports true only while the upload is in flight', async () => {
    const { service, vault } = makeService();
    const file = new TFile('note.md', { ctime: 0, mtime: 100, size: 1 });
    let resolveRead!: (value: string) => void;
    vault.read.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveRead = resolve;
      }),
    );

    const uploadPromise = service.uploadFile(asObsidianFile(file));
    expect(service.isSyncing(asObsidianFile(file))).toBe(true);

    resolveRead('content');
    await uploadPromise;

    expect(service.isSyncing(asObsidianFile(file))).toBe(false);
  });

  it('uses replacement API and settings after configure', async () => {
    const { api, service } = makeService({
      autoSyncDebounceSeconds: 5,
    });
    const newApi = {
      uploadSource: vi.fn().mockResolvedValue({
        sourceId: 'source-2',
        externalSourceId: 'note.md',
        fingerprint: 'fingerprint',
      }),
    };

    service.configure(newApi as unknown as SheskaApiClient, {
      ...DEFAULT_SETTINGS,
      autoSyncDebounceSeconds: 1,
    });
    service.onVaultFileChanged(
      asObsidianAbstractFile(
        new TFile('note.md', { ctime: 0, mtime: 100, size: 1 }),
      ),
    );
    await vi.advanceTimersByTimeAsync(1000);

    expect(api.uploadSource).not.toHaveBeenCalled();
    expect(newApi.uploadSource).toHaveBeenCalledOnce();
  });
});
