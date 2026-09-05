import { Notice, Plugin, TFile } from 'obsidian';
import { SheskaApiClient } from '@/api/client';
import { AutoSyncService } from '@/auto-sync';
import { HealthCheckScheduler } from '@/health-check';
import { SheskaSettingTab } from '@/settings';
import type { SheskaSettings } from '@/settings';
import { PluginDataStore } from '@/storage';
import type { SyncCache } from '@/storage';

export default class SheskaPlugin extends Plugin {
  declare settings: SheskaSettings;
  declare api: SheskaApiClient;
  private readonly dataStore = new PluginDataStore(this);
  private syncCache: SyncCache = {};
  private healthCheckScheduler!: HealthCheckScheduler;
  private autoSyncService!: AutoSyncService;
  private autoSyncSweepIntervalId: number | null = null;
  private syncStatusBarItem!: HTMLElement;

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
      onFileSynced: (path) => this.onFileSynced(path),
    });
  }

  private onFileSynced(path: string): void {
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

  private updateSyncStatusBar(file: TFile | null): void {
    if (!file) {
      this.syncStatusBarItem.setText('');
      return;
    }
    this.syncStatusBarItem.setText(
      this.autoSyncService.isSynced(file)
        ? 'Sheska: ✓ Synced'
        : 'Sheska: ○ Not synced',
    );
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
      this.app.vault.on('modify', (file) =>
        this.autoSyncService.onVaultFileChanged(file),
      ),
    );
    this.registerEvent(
      this.app.vault.on('create', (file) =>
        this.autoSyncService.onVaultFileChanged(file),
      ),
    );
  }
}
