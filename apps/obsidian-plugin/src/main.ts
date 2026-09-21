import { Notice, Plugin, TFile } from 'obsidian';
import type { TAbstractFile } from 'obsidian';
import { SheskaApiClient } from '@/api/client';
import { AutoSyncService } from '@/auto-sync';
import {
  FileExplorerSyncDecorator,
  type FileExplorerSyncStatus,
} from '@/file-explorer-sync-decorator';
import { HealthCheckScheduler } from '@/health-check';
import { SheskaSettingTab } from '@/settings';
import type { SheskaSettings } from '@/settings';
import { PluginDataStore } from '@/storage';
import type { SyncCache } from '@/storage';

type SyncStatus = FileExplorerSyncStatus;

const SYNC_STATUS_BAR_TEXTS: Record<SyncStatus, string> = {
  uploading: 'Sheska: ⟳ Uploading...',
  accepted: 'Sheska: ◷ Queued',
  processing: 'Sheska: ⟳ Syncing...',
  retrying: 'Sheska: ⟳ Retrying...',
  unknown: 'Sheska: ? Status unknown',
  failed: 'Sheska: ✕ Failed',
  synced: 'Sheska: ✓ Synced',
  'not-synced': 'Sheska: ○ Not synced',
};

export default class SheskaPlugin extends Plugin {
  declare settings: SheskaSettings;
  declare api: SheskaApiClient;
  private readonly dataStore = new PluginDataStore(this);
  private syncCache: SyncCache = {};
  private healthCheckScheduler!: HealthCheckScheduler;
  private autoSyncService!: AutoSyncService;
  private fileExplorerSyncDecorator!: FileExplorerSyncDecorator;
  private autoSyncSweepIntervalId: number | null = null;
  private syncJobReconcileIntervalId: number | null = null;
  private syncStatusBarItem!: HTMLElement;
  private readonly lastNotifiedStatus = new Map<string, SyncStatus>();

  async onload(): Promise<void> {
    await this.loadSettings();
    await this.loadSyncCache();
    this.initializeServices();

    this.addSettingTab(new SheskaSettingTab(this.app, this));
    this.registerCommands();
    this.registerFileMenu();
    this.registerAutoSyncEvents();
    this.registerSyncStatusBar();
    this.registerFileExplorerSyncBadges();

    this.healthCheckScheduler.start();
    this.startAutoSyncSweepInterval();
    this.startSyncJobReconcileInterval();

    if (this.settings.autoSyncEnabled) {
      void this.runSweep();
      void this.runSyncJobReconcile();
    }
  }

  onunload(): void {
    this.healthCheckScheduler.stop();
    this.stopAutoSyncSweepInterval();
    this.stopSyncJobReconcileInterval();
    this.autoSyncService.cancel();
    this.fileExplorerSyncDecorator.destroy();
  }

  async loadSettings(): Promise<void> {
    this.settings = await this.dataStore.loadSettings();
  }

  async loadSyncCache(): Promise<void> {
    this.syncCache = await this.dataStore.loadSyncCache();
    this.autoSyncService?.setSyncCache(this.syncCache);
  }

  async saveSettings(): Promise<void> {
    await this.persistData();
    this.api = new SheskaApiClient(this.settings.apiBaseUrl);
    if (this.healthCheckScheduler && this.autoSyncService) {
      this.healthCheckScheduler.configure(this.api, this.settings);
      this.autoSyncService.configure(this.api, this.settings);
    } else {
      this.initializeServices();
    }
    this.stopAutoSyncSweepInterval();
    this.startAutoSyncSweepInterval();
    this.stopSyncJobReconcileInterval();
    this.startSyncJobReconcileInterval();
  }

  private async saveSyncCache(): Promise<void> {
    await this.persistData();
  }

  async resetSyncCache(): Promise<void> {
    this.autoSyncService.resetSyncCache();
    this.lastNotifiedStatus.clear();
    await this.saveSyncCache();
    this.fileExplorerSyncDecorator.renderAll();
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) this.updateSyncStatusBar(activeFile);
  }

  private async persistData(): Promise<void> {
    this.syncCache = this.autoSyncService?.getSyncCache() ?? this.syncCache;
    await this.dataStore.save(this.settings, this.syncCache);
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

  private startSyncJobReconcileInterval(): void {
    if (!this.settings.autoSyncEnabled) return;
    const minutes = this.settings.syncJobReconcileIntervalMinutes;
    if (minutes <= 0) return;
    this.syncJobReconcileIntervalId = this.registerInterval(
      window.setInterval(
        () => {
          void this.runSyncJobReconcile();
        },
        minutes * 60 * 1000,
      ),
    );
  }

  private stopSyncJobReconcileInterval(): void {
    if (this.syncJobReconcileIntervalId !== null) {
      window.clearInterval(this.syncJobReconcileIntervalId);
      this.syncJobReconcileIntervalId = null;
    }
  }

  private async runSweep(): Promise<void> {
    await this.autoSyncService.runSweep();
  }

  private async runSyncJobReconcile(): Promise<void> {
    await this.autoSyncService.runReconcile();
  }

  private async uploadFile(file: TFile): Promise<void> {
    try {
      await this.autoSyncService.uploadFile(file);
      new Notice('Note uploaded to Sheska.');
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      new Notice(`Failed to upload note to Sheska: ${reason}`);
    }
  }

  private initializeServices(): void {
    this.api = new SheskaApiClient(this.settings.apiBaseUrl);
    this.healthCheckScheduler = new HealthCheckScheduler(
      this.api,
      this.settings,
      (id) => this.registerInterval(id),
    );
    this.autoSyncService = new AutoSyncService({
      vault: this.app.vault,
      api: this.api,
      settings: this.settings,
      syncCache: this.syncCache,
      saveSyncCache: async () => this.saveSyncCache(),
      onSyncStart: (path) => this.refreshSyncIndicators(path),
      onSyncFinished: (path) => this.refreshSyncIndicators(path),
      onSyncStateChanged: (path) => this.refreshSyncIndicators(path),
      shouldPollSyncJob: (path) =>
        this.app.workspace.getActiveFile()?.path === path,
    });
  }

  private registerFileExplorerSyncBadges(): void {
    this.fileExplorerSyncDecorator = new FileExplorerSyncDecorator((path) =>
      this.getFileExplorerSyncStatus(path),
    );
    this.fileExplorerSyncDecorator.start();
  }

  private getFileExplorerSyncStatus(
    path: string,
  ): FileExplorerSyncStatus | null {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return null;
    if (this.autoSyncService.isSyncing(file)) return 'uploading';
    if (!this.syncCache[path]) return null;
    return this.getSyncStatus(file);
  }

  private refreshSyncIndicators(path: string): void {
    this.refreshStatusBarIfActive(path);
    this.fileExplorerSyncDecorator?.render(path);
  }

  private refreshStatusBarIfActive(path: string): void {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile?.path === path) {
      this.updateSyncStatusBar(activeFile);
    }
  }

  private registerSyncStatusBar(): void {
    this.syncStatusBarItem = this.addStatusBarItem();
    const activeFile = this.app.workspace.getActiveFile();
    this.updateSyncStatusBar(activeFile);
    this.pollActiveFileSyncJob(activeFile);
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        this.updateSyncStatusBar(file);
        this.pollActiveFileSyncJob(file);
      }),
    );
  }

  private pollActiveFileSyncJob(file: TFile | null): void {
    if (!file) return;
    void this.autoSyncService
      .pollSyncJobForFile(file)
      .catch((error: unknown) => {
        console.error(
          `[Sheska] Sync job polling failed for "${file.path}":`,
          error,
        );
      });
  }

  private getSyncStatus(file: TFile): SyncStatus {
    const cached = this.syncCache[file.path];
    if (this.autoSyncService.isSyncing(file) && !cached) return 'uploading';
    if (cached?.mtime === file.stat.mtime && cached.status) {
      return cached.status;
    }
    return this.autoSyncService.isSynced(file) ? 'synced' : 'not-synced';
  }

  private updateSyncStatusBar(file: TFile | null): void {
    if (!file) {
      this.syncStatusBarItem.setText('');
      return;
    }
    const status = this.getSyncStatus(file);
    const text = SYNC_STATUS_BAR_TEXTS[status];
    this.syncStatusBarItem.setText(text);
    this.notifyStatusChange(file, status);
  }

  private notifyStatusChange(file: TFile, status: SyncStatus): void {
    const previous = this.lastNotifiedStatus.get(file.path);
    this.lastNotifiedStatus.set(file.path, status);
    if (previous === undefined || previous === status) return;

    if (status === 'synced') {
      new Notice(`Sheska: "${file.basename ?? file.path}" synced.`);
    } else if (status === 'not-synced' && previous === 'synced') {
      new Notice(`Sheska: "${file.basename ?? file.path}" not synced.`);
    }
  }

  private registerCommands(): void {
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

    this.addCommand({
      id: 'sheska-reset-sync-cache',
      name: 'Reset Sheska sync cache (force full re-sync)',
      callback: async () => {
        await this.resetSyncCache();
        new Notice('Sheska sync cache cleared. All notes will re-sync.');
      },
    });
  }

  private registerFileMenu(): void {
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
  }

  private registerAutoSyncEvents(): void {
    this.registerEvent(
      this.app.vault.on('modify', (file) => this.handleVaultFileChanged(file)),
    );
    this.registerEvent(
      this.app.vault.on('create', (file) => this.handleVaultFileChanged(file)),
    );
  }

  private handleVaultFileChanged(file: TAbstractFile): void {
    this.autoSyncService.onVaultFileChanged(file);
    if (file instanceof TFile) {
      this.refreshSyncIndicators(file.path);
    }
  }
}
