import { vi } from 'vitest';

export class App {}

export class Plugin {
  app = new App();
  addCommand = vi.fn();
  addSettingTab = vi.fn();
  loadData = vi.fn().mockResolvedValue({});
  saveData = vi.fn().mockResolvedValue(undefined);
  registerInterval = vi.fn((id: number) => id);
}

export class PluginSettingTab {
  containerEl = { empty: vi.fn() };

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

// Tracks all Setting instances created during display() so tests can assert
// which settings were rendered and how their controls were configured.
export const renderedSettings: RenderedSetting[] = [];

export interface RenderedSetting {
  name: string;
  desc: string;
  textInputs: RenderedTextInput[];
  buttons: RenderedButton[];
}

export interface RenderedTextInput {
  inputEl: { type: string; min: string; max: string };
}

export interface RenderedButton {
  text: string;
  disabled: boolean;
  click(): Promise<void>;
}

class MockTextComponent {
  inputEl = { type: 'text', min: '', max: '' };
  setPlaceholder = vi.fn().mockReturnThis();
  setValue = vi.fn().mockReturnThis();
  onChange = vi.fn().mockReturnThis();
}

class MockButtonComponent {
  constructor(private record: RenderedButton) {}

  setButtonText(text: string): this {
    this.record.text = text;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.record.disabled = disabled;
    return this;
  }

  onClick(cb: () => void | Promise<void>): this {
    this.record.click = async () => cb();
    return this;
  }
}

export class Setting {
  private record: RenderedSetting = { name: '', desc: '', textInputs: [], buttons: [] };

  constructor(_containerEl: unknown) {
    renderedSettings.push(this.record);
  }

  setName(name: string): this {
    this.record.name = name;
    return this;
  }

  setDesc(desc: string): this {
    this.record.desc = desc;
    return this;
  }

  addText(cb: (text: MockTextComponent) => void): this {
    const text = new MockTextComponent();
    cb(text);
    this.record.textInputs.push(text);
    return this;
  }

  addButton(cb: (button: MockButtonComponent) => void): this {
    const buttonRecord: RenderedButton = { text: '', disabled: false, click: async () => {} };
    cb(new MockButtonComponent(buttonRecord));
    this.record.buttons.push(buttonRecord);
    return this;
  }
}