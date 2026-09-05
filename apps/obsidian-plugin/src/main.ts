import { Notice, Plugin, TFile, debounce } from 'obsidian';
import type { TAbstractFile, Debouncer } from 'obsidian';
import { SheskaApiClient } from '@/api/client';
import { DEFAULT_SETTINGS, SheskaSettingTab } from '@/settings';
import type { SheskaSettings } from '@/settings';

export interface SyncCacheEntry {
  mtime: number;
  syncedAt: number;
}

export type SyncCache = Record<string, SyncCacheEntry>;

interface StoredData {
  settings?: Partial<SheskaSettings>;
  syncCache?: SyncCache;
}

export default class SheskaPlugin extends Plugin {
  declare settings: SheskaSettings;
  declare api: SheskaApiClient;
  private syncCache: SyncCache = {};
  private healthCheckIntervalId: number | null = null;
  private autoSyncSweepIntervalId: number | null = null;
  private dirtyFiles = new Map<string, TFile>();
  private isFlushing = false;
  private flushDebounced!: Debouncer<[], void>;

  async onload(): Promise<void> {
    await this.loadSettings();
    await this.loadSyncCache();
    this.api = new SheskaApiClient(this.settings.apiBaseUrl);

    this.addSettingTab(new SheskaSettingTab(this.app, this));

    this.addCommand({
      id: 'sheska-ping',
      name: 'Ping Sheska API',
      callback: async () => {
        try {
          await this.api.health();
          new Notice('Sheska API is reachable.');
        } catch {
          new Notice('Failed to reach Sheska API. Check settings.');
        }
      },
    });

    this.addCommand({
      id: 'sheska-upload-note',
      name: 'Upload current note to Sheska',
      callback: async () => {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          new Notice('No active note to upload.');
          return;
        }
        await this.uploadFile(file);
      },
    });

    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, abstractFile) => {
        if (!(abstractFile instanceof TFile)) return;
        menu.addItem((item) => {
          item.setTitle('Upload to Sheska').onClick(async () => {
            await this.uploadFile(abstractFile);
          });
        });
      }),
    );

    this.registerEvent(
      this.app.vault.on('modify', (file) => this.onVaultFileChanged(file)),
    );
    this.registerEvent(
      this.app.vault.on('create', (file) => this.onVaultFileChanged(file)),
    );

    this.setupFlushDebouncer();
    this.startHealthCheckInterval();
    this.startAutoSyncSweepInterval();

    if (this.settings.autoSyncEnabled) {
      void this.runSweep();
    }
  }

  onunload(): void {
    this.stopHealthCheckInterval();
    this.stopAutoSyncSweepInterval();
    this.flushDebounced?.cancel();
  }

  async loadSettings(): Promise<void> {
    const raw = ((await this.loadData()) ?? {}) as StoredData &
      Partial<SheskaSettings>;
    const savedSettings = raw.settings ?? raw;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, savedSettings);
  }

  async loadSyncCache(): Promise<void> {
    const raw = ((await this.loadData()) ?? {}) as StoredData;
    this.syncCache = raw.syncCache ?? {};
  }

  async saveSettings(): Promise<void> {
    await this.persistData();
    this.stopHealthCheckInterval();
    this.startHealthCheckInterval();
    this.stopAutoSyncSweepInterval();
    this.startAutoSyncSweepInterval();
    this.setupFlushDebouncer();
  }

  private async saveSyncCache(): Promise<void> {
    await this.persistData();
  }

  private async persistData(): Promise<void> {
    const data: StoredData = {
      settings: this.settings,
      syncCache: this.syncCache,
    };
    await this.saveData(data);
  }

  private startHealthCheckInterval(): void {
    const minutes = this.settings.healthCheckIntervalMinutes;
    if (minutes <= 0) return;
    this.healthCheckIntervalId = this.registerInterval(
      window.setInterval(
        () => {
          this.api.health().catch(() => {
            new Notice('Sheska API health check failed. Check settings.');
          });
        },
        minutes * 60 * 1000,
      ),
    );
  }

  private stopHealthCheckInterval(): void {
    if (this.healthCheckIntervalId !== null) {
      window.clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
    }
  }

  private startAutoSyncSweepInterval(): void {
    if (!this.settings.autoSyncEnabled) return;
    const minutes = this.settings.autoSyncSweepIntervalMinutes;
    if (minutes <= 0) return;
    this.autoSyncSweepIntervalId = this.registerInterval(
      window.setInterval(
        () => {
          void this.runSweep();
        },
        minutes * 60 * 1000,
      ),
    );
  }

  private stopAutoSyncSweepInterval(): void {
    if (this.autoSyncSweepIntervalId !== null) {
      window.clearInterval(this.autoSyncSweepIntervalId);
      this.autoSyncSweepIntervalId = null;
    }
  }

  private setupFlushDebouncer(): void {
    this.flushDebounced?.cancel();
    this.flushDebounced = debounce(
      () => {
        void this.flushDirtyFiles();
      },
      Math.max(this.settings.autoSyncDebounceSeconds, 0) * 1000,
      true,
    );
  }

  private onVaultFileChanged(file: TAbstractFile): void {
    if (!this.settings.autoSyncEnabled) return;
    if (!(file instanceof TFile)) return;
    this.dirtyFiles.set(file.path, file);
    this.flushDebounced();
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

  private async runSweep(): Promise<void> {
    for (const file of this.app.vault.getMarkdownFiles()) {
      await this.uploadIfChanged(file);
    }
  }

  private async uploadFileCore(file: TFile): Promise<void> {
    const mtimeAtRead = file.stat.mtime;
    const content = await this.app.vault.read(file);
    await this.api.uploadSource({ externalSourceId: file.path, content });
    this.syncCache[file.path] = { mtime: mtimeAtRead, syncedAt: Date.now() };
    await this.saveSyncCache();
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

  private async uploadFile(file: TFile): Promise<void> {
    try {
      await this.uploadFileCore(file);
      new Notice('Note uploaded to Sheska.');
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      new Notice(`Failed to upload note to Sheska: ${reason}`);
    }
  }
}
