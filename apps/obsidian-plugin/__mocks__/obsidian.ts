import { vi } from 'vitest';

export class App {}

export class Plugin {
  app = new App();
  addCommand = vi.fn();
  addSettingTab = vi.fn();
  loadData = vi.fn().mockResolvedValue({});
  saveData = vi.fn().mockResolvedValue(undefined);
}

export class PluginSettingTab {
  constructor(
    public app: App,
    public plugin: Plugin,
  ) {}
}

// Tracks all Notice messages so tests can assert without a constructor spy.
export const noticeMessages: string[] = [];

export class Notice {
  constructor(public message: string) {
    noticeMessages.push(message);
  }
}