import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { noticeMessages, TAbstractFile, TFile } from '../__mocks__/obsidian';
import { SheskaApiError } from '@/api/client';
import type { SheskaApiClient } from '@/api/client';
import { AutoSyncService, UploadBlockedError } from '@/auto-sync';
import { DEFAULT_SETTINGS } from '@/settings';
import type { SheskaSettings } from '@/settings';
import type { AttachmentCache, SyncCache } from '@/storage';
import type { CachedMetadata, TAbstractFile as ObsidianAbstractFile, TFile as ObsidianFile } from 'obsidian';

function keyOf(path: string): string {
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  return `attachments/${createHash('sha256').update(path).digest('hex')}.${extension}`;
}

function asObsidianFile(file: TFile): ObsidianFile {
  return file as unknown as ObsidianFile;
}

function asObsidianAbstractFile(file: TAbstractFile | TFile): ObsidianAbstractFile {
  return file as unknown as ObsidianAbstractFile;
}

function syncTargetMetadataCache() {
  return {
    getFileCache: vi.fn(
      (_file: ObsidianFile): CachedMetadata => ({
        frontmatter: { sheska: true },
      }),
    ),
    getFirstLinkpathDest: vi.fn((_linkpath: string, _sourcePath: string): ObsidianFile | null => null),
  };
}

function withEmbeds(
  metadataCache: ReturnType<typeof syncTargetMetadataCache>,
  embeds: { link: string; original: string }[],
  vaultFiles: TFile[],
) {
  const position = {
    start: { line: 0, col: 0, offset: 0 },
    end: { line: 0, col: 0, offset: 0 },
  };
  metadataCache.getFileCache.mockReturnValue({
    frontmatter: { sheska: true },
    embeds: embeds.map((embed) => ({ ...embed, position })),
  });
  metadataCache.getFirstLinkpathDest.mockImplementation((linkpath) => {
    const file = vaultFiles.find((candidate) => candidate.path === linkpath || candidate.path.endsWith(`/${linkpath}`));
    return file ? asObsidianFile(file) : null;
  });
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
    uploadAttachment: vi.fn().mockResolvedValue({}),
  };
  const vault = {
    read: vi.fn().mockResolvedValue('content'),
    readBinary: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
    getMarkdownFiles: vi.fn().mockReturnValue([]),
    getAbstractFileByPath: vi.fn().mockReturnValue(null),
  };
  const metadataCache = syncTargetMetadataCache();
  const saveSyncCache = vi.fn().mockResolvedValue(undefined);
  const attachmentCache: AttachmentCache = {};
  const saveAttachmentCache = vi.fn().mockResolvedValue(undefined);
  const service = new AutoSyncService({
    vault: vault as never,
    metadataCache,
    api: api as unknown as SheskaApiClient,
    settings: {
      ...DEFAULT_SETTINGS,
      ...settings,
    },
    syncCache,
    attachmentCache,
    saveSyncCache,
    saveAttachmentCache,
    shouldPollSyncJob,
    ...serviceOptions,
  });
  return {
    api,
    attachmentCache,
    metadataCache,
    saveAttachmentCache,
    saveSyncCache,
    service,
    vault,
  };
}

describe('AutoSyncService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    noticeMessages.length = 0;
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
      content: '---\ntitle: note\n---\ncontent',
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
    api.getSyncJob.mockResolvedValueOnce({ status: 'processing' }).mockResolvedValueOnce({ status: 'completed' });
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

    await expect(service.uploadFile(asObsidianFile(file))).resolves.toBeUndefined();
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

  // nocap: library-sync-9
  it('creates a new sync job one minute after reconciliation finds an initial failure', async () => {
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
  ])('waits $delayMs ms before retrying after $retryCount previous retries', async ({ retryCount, delayMs }) => {
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
  });

  it('records a retryable upload failure so the sweep stops re-uploading it', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
    const syncCache: SyncCache = {};
    const { api, service, vault } = makeService({}, syncCache);
    vault.getMarkdownFiles.mockReturnValue([file]);
    api.uploadSource.mockRejectedValue(new SheskaApiError(503, 'Service Unavailable', ''));

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

  // nocap: library-sync-9
  it('keeps an upload the server rejects scheduled for another retry', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
    const syncCache: SyncCache = {};
    const { api, service, vault } = makeService({}, syncCache);
    vault.getMarkdownFiles.mockReturnValue([file]);
    api.uploadSource.mockRejectedValue(new SheskaApiError(400, 'Bad Request', ''));

    await service.runSweep();

    expect(syncCache['note.md']).toMatchObject({ status: 'failed' });
    expect(syncCache['note.md'].nextRetryAt).toEqual(expect.any(Number));
    errorSpy.mockRestore();
  });

  // nocap: library-sync-9
  it('retries a failed upload once its backoff elapses', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const file = new TFile('note.md', { ctime: 0, mtime: 123, size: 1 });
    const syncCache: SyncCache = {};
    const { api, service, vault } = makeService({}, syncCache, () => false);
    vault.getMarkdownFiles.mockReturnValue([file]);
    vault.getAbstractFileByPath.mockReturnValue(file);
    api.uploadSource.mockRejectedValueOnce(new SheskaApiError(503, 'Service Unavailable', ''));

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

  // nocap: library-sync-9
  it('keeps retrying an upload past the old attempt limit', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const file = new TFile('note.md', { ctime: 0, mtime: 200, size: 1 });
    const syncCache: SyncCache = {
      'note.md': { mtime: 123, status: 'failed', retryCount: 3 },
    };
    const { api, service, vault } = makeService({}, syncCache);
    vault.getMarkdownFiles.mockReturnValue([file]);
    api.uploadSource.mockRejectedValue(new SheskaApiError(503, 'Service Unavailable', ''));

    await service.runSweep();

    expect(syncCache['note.md']).toMatchObject({
      mtime: 200,
      status: 'failed',
    });
    expect(syncCache['note.md'].nextRetryAt).toEqual(expect.any(Number));
    errorSpy.mockRestore();
  });

  // nocap: library-sync-9
  it('schedules another retry when the server reports a failed sync job', async () => {
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

    expect(api.uploadSource.mock.calls.map(([body]) => (body as { externalSourceId: string }).externalSourceId)).toEqual(['a.md', 'b.md']);
  });

  // nocap: library-sync-10
  it('ignores vault changes when auto-sync is disabled', async () => {
    const { api, service } = makeService({
      autoSyncEnabled: false,
      autoSyncDebounceSeconds: 1,
    });

    service.onVaultFileChanged(asObsidianAbstractFile(new TFile('note.md', { ctime: 0, mtime: 100, size: 1 })));
    await vi.advanceTimersByTimeAsync(1000);

    expect(api.uploadSource).not.toHaveBeenCalled();
  });

  it('ignores non-file vault changes', async () => {
    const { api, service } = makeService({ autoSyncDebounceSeconds: 1 });

    service.onVaultFileChanged(asObsidianAbstractFile(new TAbstractFile('folder')));
    await vi.advanceTimersByTimeAsync(1000);

    expect(api.uploadSource).not.toHaveBeenCalled();
  });

  // nocap: library-source-6
  it('uploads vault changes only from notes whose frontmatter sheska is the boolean true', async () => {
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

    for (const path of ['target.md', 'string.md', 'yes.md', 'number.md', 'opted-out.md', 'no-frontmatter.md']) {
      service.onVaultFileChanged(asObsidianAbstractFile(new TFile(path, { ctime: 0, mtime: 100, size: 1 })));
    }
    await vi.advanceTimersByTimeAsync(1000);

    expect(api.uploadSource.mock.calls.map(([body]) => (body as { externalSourceId: string }).externalSourceId)).toEqual(['target.md']);
  });

  it('skips changed-file uploads when the cached mtime matches', async () => {
    const { api, service } = makeService({ autoSyncDebounceSeconds: 1 }, { 'note.md': { mtime: 100, syncedAt: 1 } });

    service.onVaultFileChanged(asObsidianAbstractFile(new TFile('note.md', { ctime: 0, mtime: 100, size: 1 })));
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
    const { api, service, vault } = makeService({}, { 'unchanged.md': { mtime: 100, syncedAt: 1 } });
    vault.getMarkdownFiles.mockReturnValue([unchanged, changed]);

    await service.runSweep();

    expect(api.uploadSource).toHaveBeenCalledOnce();
    expect(api.uploadSource).toHaveBeenCalledWith({
      externalSourceId: 'changed.md',
      content: '---\ntitle: changed\n---\ncontent',
    });
  });

  // nocap: library-source-6
  it('sweeps only markdown files whose frontmatter sheska is true', async () => {
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
      content: '---\ntitle: today\n---\ncontent',
    });
  });

  // nocap: library-source-6
  it('stops retrying a failed note once its frontmatter no longer has sheska true', async () => {
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
    api.uploadSource.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({
      sourceId: 'source-2',
      externalSourceId: 'b.md',
      fingerprint: 'fingerprint',
    });

    service.onVaultFileChanged(asObsidianAbstractFile(new TFile('a.md', { ctime: 0, mtime: 100, size: 1 })));
    service.onVaultFileChanged(asObsidianAbstractFile(new TFile('b.md', { ctime: 0, mtime: 200, size: 1 })));
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

  // nocap: library-sync-3
  it('captures mtime before reading content so concurrent edits are not lost', async () => {
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
    const { service } = makeService({}, { 'note.md': { mtime: 100, syncedAt: 1 } });

    expect(service.isSynced(asObsidianFile(new TFile('note.md', { ctime: 0, mtime: 100, size: 1 })))).toBe(true);
    expect(service.isSynced(asObsidianFile(new TFile('note.md', { ctime: 0, mtime: 200, size: 1 })))).toBe(false);
    expect(service.isSynced(asObsidianFile(new TFile('other.md', { ctime: 0, mtime: 100, size: 1 })))).toBe(false);
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
      attachmentCache: {},
      saveSyncCache: vi.fn().mockResolvedValue(undefined),
      saveAttachmentCache: vi.fn().mockResolvedValue(undefined),
      onSyncFinished,
    });

    await service.uploadFile(asObsidianFile(new TFile('note.md', { ctime: 0, mtime: 100, size: 1 })));

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
      attachmentCache: {},
      saveSyncCache: vi.fn().mockResolvedValue(undefined),
      saveAttachmentCache: vi.fn().mockResolvedValue(undefined),
      onSyncStart,
    });

    await service.uploadFile(asObsidianFile(new TFile('note.md', { ctime: 0, mtime: 100, size: 1 })));

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
      attachmentCache: {},
      saveSyncCache: vi.fn().mockResolvedValue(undefined),
      saveAttachmentCache: vi.fn().mockResolvedValue(undefined),
      onSyncFinished,
    });

    service.onVaultFileChanged(asObsidianAbstractFile(new TFile('note.md', { ctime: 0, mtime: 100, size: 1 })));
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
    service.onVaultFileChanged(asObsidianAbstractFile(new TFile('note.md', { ctime: 0, mtime: 100, size: 1 })));
    await vi.advanceTimersByTimeAsync(1000);

    expect(api.uploadSource).not.toHaveBeenCalled();
    expect(newApi.uploadSource).toHaveBeenCalledOnce();
  });

  describe('embedded images', () => {
    const note = new TFile('notes/meeting.md', {
      ctime: 0,
      mtime: 100,
      size: 1,
    });

    it('uploads an image linked by its vault path before the note', async () => {
      const { api, attachmentCache, metadataCache, saveAttachmentCache, service, vault } = makeService();
      const image = new TFile('att/my img.png', {
        ctime: 0,
        mtime: 50,
        size: 4,
      });
      withEmbeds(metadataCache, [{ link: 'att/my img.png', original: '![](att/my%20img.png)' }], [image]);

      await service.uploadFile(asObsidianFile(note));

      expect(vault.readBinary).toHaveBeenCalledWith(image);
      expect(api.uploadAttachment).toHaveBeenCalledWith(keyOf('att/my img.png'), new ArrayBuffer(4));
      expect(api.uploadAttachment.mock.invocationCallOrder[0]).toBeLessThan(api.uploadSource.mock.invocationCallOrder[0]);
      expect(attachmentCache['att/my img.png']).toEqual({
        mtime: 50,
        size: 4,
        key: keyOf('att/my img.png'),
      });
      expect(saveAttachmentCache).toHaveBeenCalledOnce();
    });

    it('skips an image whose mtime and size match the cache', async () => {
      const { api, attachmentCache, metadataCache, saveAttachmentCache, service } = makeService();
      attachmentCache['att/a.png'] = {
        mtime: 50,
        size: 4,
        key: keyOf('att/a.png'),
      };
      withEmbeds(
        metadataCache,
        [{ link: 'att/a.png', original: '![](att/a.png)' }],
        [new TFile('att/a.png', { ctime: 0, mtime: 50, size: 4 })],
      );

      await service.uploadFile(asObsidianFile(note));

      expect(api.uploadAttachment).not.toHaveBeenCalled();
      expect(saveAttachmentCache).not.toHaveBeenCalled();
      expect(api.uploadSource).toHaveBeenCalledOnce();
    });

    it('re-uploads an image cached before hashed names, even when unchanged', async () => {
      const { api, attachmentCache, metadataCache, service } = makeService();
      attachmentCache['att/a.png'] = { mtime: 50, size: 4 };
      withEmbeds(
        metadataCache,
        [{ link: 'att/a.png', original: '![](att/a.png)' }],
        [new TFile('att/a.png', { ctime: 0, mtime: 50, size: 4 })],
      );

      await service.uploadFile(asObsidianFile(note));

      expect(api.uploadAttachment).toHaveBeenCalledWith(keyOf('att/a.png'), new ArrayBuffer(4));
      expect(attachmentCache['att/a.png']).toEqual({
        mtime: 50,
        size: 4,
        key: keyOf('att/a.png'),
      });
    });

    it('re-uploads an image whose size changed', async () => {
      const { api, attachmentCache, metadataCache, service } = makeService();
      attachmentCache['att/a.png'] = {
        mtime: 50,
        size: 4,
        key: keyOf('att/a.png'),
      };
      withEmbeds(
        metadataCache,
        [{ link: 'att/a.png', original: '![](att/a.png)' }],
        [new TFile('att/a.png', { ctime: 0, mtime: 50, size: 8 })],
      );

      await service.uploadFile(asObsidianFile(note));

      expect(api.uploadAttachment).toHaveBeenCalledOnce();
      expect(attachmentCache['att/a.png']).toEqual({
        mtime: 50,
        size: 8,
        key: keyOf('att/a.png'),
      });
    });

    // nocap: library-sync-12
    it('uploads wiki and shortest-path embeds under hashed names and rewrites their links', async () => {
      const { api, metadataCache, service, vault } = makeService();
      withEmbeds(
        metadataCache,
        [
          { link: 'att/a.png', original: '![[att/a.png|300]]' },
          { link: 'b.png', original: '![](b.png)' },
        ],
        [new TFile('att/a.png', { ctime: 0, mtime: 50, size: 4 }), new TFile('att/b.png', { ctime: 0, mtime: 50, size: 4 })],
      );
      vault.read.mockResolvedValue('---\nsheska: true\n---\n![[att/a.png|300]]\n![](b.png)\n');

      await service.uploadFile(asObsidianFile(note));

      expect(api.uploadAttachment.mock.calls.map((call) => call[0] as string)).toEqual([keyOf('att/a.png'), keyOf('att/b.png')]);
      expect(api.uploadSource).toHaveBeenCalledWith({
        externalSourceId: 'notes/meeting.md',
        content: `---\nsheska: true\ntitle: meeting\n---\n![|300](${keyOf('att/a.png')})\n![](${keyOf('att/b.png')})\n`,
      });
      expect(noticeMessages).toEqual([]);
    });

    it('ignores embeds that are not images or do not resolve to a file', async () => {
      const { api, metadataCache, service } = makeService();
      withEmbeds(
        metadataCache,
        [
          { link: 'other.md', original: '![[other.md]]' },
          { link: 'att/doc.pdf', original: '![](att/doc.pdf)' },
          { link: 'att/missing.png', original: '![](att/missing.png)' },
        ],
        [new TFile('other.md', { ctime: 0, mtime: 50, size: 4 }), new TFile('att/doc.pdf', { ctime: 0, mtime: 50, size: 4 })],
      );

      await service.uploadFile(asObsidianFile(note));

      expect(api.uploadAttachment).not.toHaveBeenCalled();
      expect(noticeMessages).toEqual([]);
      expect(api.uploadSource).toHaveBeenCalledOnce();
    });

    it('skips an image larger than the server limit', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { api, attachmentCache, metadataCache, service } = makeService();
      withEmbeds(
        metadataCache,
        [{ link: 'att/huge.png', original: '![](att/huge.png)' }],
        [
          new TFile('att/huge.png', {
            ctime: 0,
            mtime: 50,
            size: 20 * 1024 * 1024 + 1,
          }),
        ],
      );

      await service.uploadFile(asObsidianFile(note));

      expect(api.uploadAttachment).not.toHaveBeenCalled();
      expect(attachmentCache['att/huge.png']).toBeUndefined();
      expect(api.uploadSource).toHaveBeenCalledOnce();
      warnSpy.mockRestore();
    });

    it('fails the note upload when the image upload fails transiently', async () => {
      const { api, attachmentCache, metadataCache, service } = makeService();
      api.uploadAttachment.mockRejectedValue(new TypeError('Failed to fetch'));
      withEmbeds(
        metadataCache,
        [{ link: 'att/a.png', original: '![](att/a.png)' }],
        [new TFile('att/a.png', { ctime: 0, mtime: 50, size: 4 })],
      );

      await expect(service.uploadFile(asObsidianFile(note))).rejects.toThrow('Failed to fetch');

      expect(api.uploadSource).not.toHaveBeenCalled();
      expect(attachmentCache['att/a.png']).toBeUndefined();
    });

    it('notifies once about an image the server rejects, and still uploads the note', async () => {
      const { api, attachmentCache, metadataCache, service } = makeService();
      api.uploadAttachment.mockRejectedValue(new SheskaApiError(422, 'Unprocessable Entity', '', 'attachment.corrupt_image'));
      withEmbeds(
        metadataCache,
        [{ link: 'att/broken.png', original: '![](att/broken.png)' }],
        [new TFile('att/broken.png', { ctime: 0, mtime: 50, size: 4 })],
      );

      await service.uploadFile(asObsidianFile(note));

      expect(noticeMessages).toEqual(['Sheska: "att/broken.png" was rejected (attachment.corrupt_image).']);
      expect(attachmentCache['att/broken.png']).toEqual({
        mtime: 50,
        size: 4,
        key: keyOf('att/broken.png'),
        rejected: true,
      });
      expect(api.uploadSource).toHaveBeenCalledOnce();
    });
  });

  describe('changed images', () => {
    it('re-uploads a changed image that a synced note embeds, without the note', async () => {
      const { api, attachmentCache, saveAttachmentCache, service, vault } = makeService({ autoSyncDebounceSeconds: 1 });
      attachmentCache['att/a.png'] = {
        mtime: 50,
        size: 4,
        key: keyOf('att/a.png'),
      };
      const image = new TFile('att/a.png', { ctime: 0, mtime: 60, size: 4 });

      service.onVaultFileChanged(asObsidianAbstractFile(image));
      await vi.advanceTimersByTimeAsync(1000);
      await vi.waitFor(() => expect(saveAttachmentCache).toHaveBeenCalled());

      expect(vault.readBinary).toHaveBeenCalledWith(image);
      expect(api.uploadAttachment).toHaveBeenCalledWith(keyOf('att/a.png'), new ArrayBuffer(4));
      expect(api.uploadSource).not.toHaveBeenCalled();
      expect(attachmentCache['att/a.png']).toEqual({
        mtime: 60,
        size: 4,
        key: keyOf('att/a.png'),
      });
      expect(saveAttachmentCache).toHaveBeenCalledOnce();
    });

    // nocap: library-sync-11
    it('does not upload a changed image that no synced note has embedded', async () => {
      const { api, metadataCache, service } = makeService({
        autoSyncDebounceSeconds: 1,
      });
      withFrontmatter(metadataCache, {});

      service.onVaultFileChanged(asObsidianAbstractFile(new TFile('photos/private.jpg', { ctime: 0, mtime: 60, size: 4 })));
      await vi.advanceTimersByTimeAsync(1000);

      expect(api.uploadAttachment).not.toHaveBeenCalled();
      expect(api.uploadSource).not.toHaveBeenCalled();
    });

    it('re-uploads cached images that changed while Obsidian was closed during a sweep', async () => {
      const { api, attachmentCache, service, vault } = makeService();
      attachmentCache['att/changed.png'] = {
        mtime: 50,
        size: 4,
        key: keyOf('att/changed.png'),
      };
      attachmentCache['att/same.png'] = {
        mtime: 50,
        size: 4,
        key: keyOf('att/same.png'),
      };
      attachmentCache['att/deleted.png'] = {
        mtime: 50,
        size: 4,
        key: keyOf('att/deleted.png'),
      };
      const files = [
        new TFile('att/changed.png', { ctime: 0, mtime: 60, size: 4 }),
        new TFile('att/same.png', { ctime: 0, mtime: 50, size: 4 }),
      ];
      vault.getAbstractFileByPath.mockImplementation((path: string) => files.find((file) => file.path === path) ?? null);

      await service.runSweep();

      expect(api.uploadAttachment).toHaveBeenCalledOnce();
      expect(api.uploadAttachment).toHaveBeenCalledWith(keyOf('att/changed.png'), new ArrayBuffer(4));
    });

    it('re-uploads every embedded image after the sync cache is reset', async () => {
      const { api, attachmentCache, metadataCache, service } = makeService();
      attachmentCache['att/a.png'] = {
        mtime: 50,
        size: 4,
        key: keyOf('att/a.png'),
      };
      withEmbeds(
        metadataCache,
        [{ link: 'att/a.png', original: '![](att/a.png)' }],
        [new TFile('att/a.png', { ctime: 0, mtime: 50, size: 4 })],
      );

      service.resetSyncCache();
      await service.uploadFile(asObsidianFile(new TFile('notes/meeting.md', { ctime: 0, mtime: 100, size: 1 })));

      expect(api.uploadAttachment).toHaveBeenCalledWith(keyOf('att/a.png'), new ArrayBuffer(4));
      expect(service.getAttachmentCache()).toEqual({
        'att/a.png': { mtime: 50, size: 4, key: keyOf('att/a.png') },
      });
    });

    // nocap: library-sync-9
    it('retries a rejected image on every sweep without notifying again', async () => {
      const { api, attachmentCache, service, vault } = makeService();
      attachmentCache['att/a.png'] = {
        mtime: 50,
        size: 4,
        key: keyOf('att/a.png'),
        rejected: true,
      };
      vault.getAbstractFileByPath.mockReturnValue(new TFile('att/a.png', { ctime: 0, mtime: 50, size: 4 }));
      api.uploadAttachment.mockRejectedValueOnce(new SheskaApiError(422, 'Unprocessable Entity', '', 'attachment.too_many_pixels'));

      await service.runSweep();
      expect(attachmentCache['att/a.png']).toEqual({
        mtime: 50,
        size: 4,
        key: keyOf('att/a.png'),
        rejected: true,
      });

      await service.runSweep();
      expect(api.uploadAttachment).toHaveBeenCalledTimes(2);
      expect(attachmentCache['att/a.png']).toEqual({
        mtime: 50,
        size: 4,
        key: keyOf('att/a.png'),
      });
      expect(noticeMessages).toEqual([]);
    });

    it('retries an image upload that failed transiently on the next sweep', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { api, attachmentCache, service, vault } = makeService();
      attachmentCache['att/a.png'] = {
        mtime: 50,
        size: 4,
        key: keyOf('att/a.png'),
      };
      const image = new TFile('att/a.png', { ctime: 0, mtime: 60, size: 4 });
      vault.getAbstractFileByPath.mockReturnValue(image);
      api.uploadAttachment.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await service.runSweep();
      expect(attachmentCache['att/a.png']).toEqual({
        mtime: 50,
        size: 4,
        key: keyOf('att/a.png'),
      });

      await service.runSweep();
      expect(api.uploadAttachment).toHaveBeenCalledTimes(2);
      expect(attachmentCache['att/a.png']).toEqual({
        mtime: 60,
        size: 4,
        key: keyOf('att/a.png'),
      });
      errorSpy.mockRestore();
    });
  });

  describe('masking', () => {
    const MASKED_NOTE = ['---', 'sheska: true', 'sheska-mask:', '  CertBear: A사', '---', 'CertBear 설계'].join('\n');
    const note = new TFile('notes/meeting.md', {
      ctime: 0,
      mtime: 100,
      size: 1,
    });

    it('uploads the masked content', async () => {
      const { api, service, vault } = makeService();
      vault.read.mockResolvedValue(MASKED_NOTE);

      await service.uploadFile(asObsidianFile(note));

      expect(api.uploadSource).toHaveBeenCalledWith({
        externalSourceId: 'notes/meeting.md',
        content: '---\nsheska: true\ntitle: meeting\n---\nA사 설계',
      });
    });

    it('reads the note before uploading its images', async () => {
      const { api, metadataCache, service, vault } = makeService();
      withEmbeds(
        metadataCache,
        [{ link: 'att/a.png', original: '![](att/a.png)' }],
        [new TFile('att/a.png', { ctime: 0, mtime: 50, size: 4 })],
      );

      await service.uploadFile(asObsidianFile(note));

      expect(vault.read.mock.invocationCallOrder[0]).toBeLessThan(api.uploadAttachment.mock.invocationCallOrder[0]);
    });

    // nocap: library-sync-14
    it('does not upload a note whose mask list is not a mapping, and notifies once', async () => {
      const syncCache: SyncCache = {};
      const { api, service, vault } = makeService({ autoSyncDebounceSeconds: 1 }, syncCache);
      vault.read.mockResolvedValue('---\nsheska: true\nsheska-mask: [CertBear]\n---\nCertBear');

      for (let i = 0; i < 2; i += 1) {
        service.onVaultFileChanged(asObsidianAbstractFile(note));
        await vi.advanceTimersByTimeAsync(1000);
      }

      expect(api.uploadSource).not.toHaveBeenCalled();
      expect(syncCache['notes/meeting.md']).toBeUndefined();
      expect(noticeMessages).toEqual(['Sheska: "notes/meeting.md" was not uploaded: sheska-mask must be a mapping of word: replacement.']);
    });

    it('uploads an image whose path contains a masked word without exposing the word', async () => {
      const { api, metadataCache, service, vault } = makeService();
      vault.read.mockResolvedValue(`${MASKED_NOTE}\n![](att/certbear_axis.svg)`);
      withEmbeds(
        metadataCache,
        [
          {
            link: 'att/certbear_axis.svg',
            original: '![](att/certbear_axis.svg)',
          },
        ],
        [new TFile('att/certbear_axis.svg', { ctime: 0, mtime: 50, size: 4 })],
      );

      await service.uploadFile(asObsidianFile(note));

      expect(api.uploadAttachment).toHaveBeenCalledWith(keyOf('att/certbear_axis.svg'), new ArrayBuffer(4));
      const [{ content }] = api.uploadSource.mock.calls[0] as [{ content: string }];
      expect(content).toContain(`![](${keyOf('att/certbear_axis.svg')})`);
      expect(content).not.toMatch(/certbear/i);
    });

    it('rejects a manual upload that masking blocks', async () => {
      const { api, service, vault } = makeService();
      vault.read.mockResolvedValue('---\nsheska: true\nsheska-mask: CertBear\n---\n');

      await expect(service.uploadFile(asObsidianFile(note))).rejects.toThrow(UploadBlockedError);
      expect(api.uploadSource).not.toHaveBeenCalled();
    });
  });
});
