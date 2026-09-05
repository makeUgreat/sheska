import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TAbstractFile, TFile } from '../__mocks__/obsidian';
import type { SheskaApiClient } from '@/api/client';
import { AutoSyncService } from '@/auto-sync';
import { DEFAULT_SETTINGS } from '@/settings';
import type { SheskaSettings } from '@/settings';
import type { SyncCache } from '@/storage';
import type {
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

function makeService(
  settings: Partial<SheskaSettings> = {},
  syncCache: SyncCache = {},
) {
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
  const saveSyncCache = vi.fn().mockResolvedValue(undefined);
  const service = new AutoSyncService({
    vault: vault as never,
    api: api as unknown as SheskaApiClient,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    syncCache,
    saveSyncCache,
  });
  return { api, saveSyncCache, service, vault };
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

  it('ignores vault changes when auto-sync is disabled', async () => {
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
    expect(service.getSyncCache()).not.toHaveProperty('a.md');
    expect(service.getSyncCache()).toHaveProperty('b.md');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

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
      api: api as unknown as SheskaApiClient,
      settings: { ...DEFAULT_SETTINGS, autoSyncDebounceSeconds: 1 },
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
