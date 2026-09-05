import { Notice, Plugin, TFile } from 'obsidian';
import type { TAbstractFile } from 'obsidian';
import { SheskaApiClient } from '@/api/client';
import { AutoSyncService } from '@/auto-sync';
import { HealthCheckScheduler } from '@/health-check';
import { SheskaSettingTab } from '@/settings';
import type { SheskaSettings } from '@/settings';
import { PluginDataStore } from '@/storage';
import type { SyncCache } from '@/storage';

type SyncStatus = 'synced' | 'not-synced' | 'syncing';

export default class SheskaPlugin extends Plugin {
  declare settings: SheskaSettings;
  declare api: SheskaApiClient;
  private readonly dataStore = new PluginDataStore(this);
  private syncCache: SyncCache = {};
  private healthCheckScheduler!: HealthCheckScheduler;
  private autoSyncService!: AutoSyncService;
  private autoSyncSweepIntervalId: number | null = null;
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

    this.healthCheckScheduler.start();
    this.startAutoSyncSweepInterval();

    if (this.settings.autoSyncEnabled) {
      void this.runSweep();
    }
  }

  onunload(): void {
    this.healthCheckScheduler.stop();
    this.stopAutoSyncSweepInterval();
    this.autoSyncService.cancel();
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
  }

  private async saveSyncCache(): Promise<void> {
    await this.persistData();
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

  private async runSweep(): Promise<void> {
    await this.autoSyncService.runSweep();
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
      onSyncStart: (path) => this.refreshStatusBarIfActive(path),
      onSyncFinished: (path) => this.refreshStatusBarIfActive(path),
    });
  }

  private refreshStatusBarIfActive(path: string): void {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile?.path === path) {
      this.updateSyncStatusBar(activeFile);
    }
  }

  private registerSyncStatusBar(): void {
    this.syncStatusBarItem = this.addStatusBarItem();
    this.updateSyncStatusBar(this.app.workspace.getActiveFile());
    this.registerEvent(
      this.app.workspace.on('file-open', (file) =>
        this.updateSyncStatusBar(file),
      ),
    );
  }

  private getSyncStatus(file: TFile): SyncStatus {
    if (this.autoSyncService.isSyncing(file)) return 'syncing';
    return this.autoSyncService.isSynced(file) ? 'synced' : 'not-synced';
  }

  private updateSyncStatusBar(file: TFile | null): void {
    if (!file) {
      this.syncStatusBarItem.setText('');
      return;
    }
    const status = this.getSyncStatus(file);
    const text =
      status === 'syncing'
        ? 'Sheska: ⟳ Syncing...'
        : status === 'synced'
          ? 'Sheska: ✓ Synced'
          : 'Sheska: ○ Not synced';
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
      this.refreshStatusBarIfActive(file.path);
    }
  }
}
