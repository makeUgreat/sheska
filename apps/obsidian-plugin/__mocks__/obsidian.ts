import { vi } from 'vitest';

export interface FileStats {
  ctime: number;
  mtime: number;
  size: number;
}

export class TFile {
  constructor(
    public path: string,
    public stat: FileStats = { ctime: 0, mtime: 0, size: 0 },
  ) {}
}

export class TAbstractFile {
  constructor(public path: string) {}
}

export interface RenderedMenuItem {
  title: string;
  click(): Promise<void>;
}

export const fileMenuItems: RenderedMenuItem[] = [];
export let fileMenuHandler: ((menu: Menu, file: TFile) => void) | null = null;

class MockMenuItem {
  private record: RenderedMenuItem;
  constructor(record: RenderedMenuItem) {
    this.record = record;
  }
  setTitle(title: string): this {
    this.record.title = title;
    return this;
  }
  onClick(cb: () => void | Promise<void>): this {
    this.record.click = async () => cb();
    return this;
  }
}

export class Menu {
  addItem(cb: (item: MockMenuItem) => void): this {
    const record: RenderedMenuItem = { title: '', click: async () => {} };
    fileMenuItems.push(record);
    cb(new MockMenuItem(record));
    return this;
  }
}

export const workspaceEventHandlers: Record<
  string,
  ((...args: unknown[]) => void) | undefined
> = {};

class MockWorkspace {
  getActiveFile = vi.fn().mockReturnValue(null);

  on(
    event: string,
    handler: ((menu: Menu, file: TFile) => void) | ((...args: unknown[]) => void),
  ): object {
    if (event === 'file-menu') {
      fileMenuHandler = handler as (menu: Menu, file: TFile) => void;
    } else {
      workspaceEventHandlers[event] = handler as (...args: unknown[]) => void;
    }
    return {};
  }
}

export const vaultEventHandlers: Record<
  string,
  ((...args: unknown[]) => void) | undefined
> = {};

class MockVault {
  read = vi.fn().mockResolvedValue('');
  getFiles = vi.fn().mockReturnValue([]);
  getMarkdownFiles = vi.fn().mockReturnValue([]);

  on(event: string, handler: (...args: unknown[]) => void): object {
    vaultEventHandlers[event] = handler;
    return {};
  }
}

export class App {
  workspace = new MockWorkspace();
  vault = new MockVault();
}

export interface Debouncer<T extends unknown[], V> {
  (...args: T): this;
  cancel(): this;
  run(): V | void;
}

// Real-timer-backed fake so tests can use vi.useFakeTimers()/advanceTimersByTimeAsync
// to observe genuine coalescing behavior, instead of a synchronous passthrough that
// would make it impossible to test multi-call debounce semantics.
export function debounce<T extends unknown[], V>(
  cb: (...args: T) => V,
  timeout = 0,
  resetTimer = false,
): Debouncer<T, V> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: T;

  const fn = ((...args: T) => {
    lastArgs = args;
    if (timer !== null && resetTimer) {
      clearTimeout(timer);
      timer = null;
    }
    if (timer === null) {
      timer = setTimeout(() => {
        timer = null;
        cb(...lastArgs);
      }, timeout);
    }
    return fn;
  }) as Debouncer<T, V>;

  fn.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    return fn;
  };

  fn.run = () => {
    fn.cancel();
    return cb(...lastArgs);
  };

  return fn;
}

// Tracks status bar items created via addStatusBarItem() so tests can assert
// on the text set through the real obsidian.d.ts HTMLElement.setText() API.
export interface RenderedStatusBarItem {
  text: string;
}

export const statusBarItems: RenderedStatusBarItem[] = [];

class MockStatusBarItem {
  constructor(private record: RenderedStatusBarItem) {}

  setText(text: string): void {
    this.record.text = text;
  }
}

export class Plugin {
  app = new App();
  addCommand = vi.fn();
  addSettingTab = vi.fn();
  registerEvent = vi.fn();
  loadData = vi.fn().mockResolvedValue({});
  saveData = vi.fn().mockResolvedValue(undefined);
  registerInterval = vi.fn((id: number) => id);
  addStatusBarItem = vi.fn((): HTMLElement => {
    const record: RenderedStatusBarItem = { text: '' };
    statusBarItems.push(record);
    return new MockStatusBarItem(record) as unknown as HTMLElement;
  });
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
  toggles: RenderedToggle[];
}

export interface RenderedToggle {
  value: boolean;
  onChange(value: boolean): Promise<void>;
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

class MockToggleComponent {
  constructor(private record: RenderedToggle) {}

  setValue(value: boolean): this {
    this.record.value = value;
    return this;
  }

  onChange(cb: (value: boolean) => void | Promise<void>): this {
    this.record.onChange = async (value: boolean) => cb(value);
    return this;
  }
}

export class Setting {
  private record: RenderedSetting = {
    name: '',
    desc: '',
    textInputs: [],
    buttons: [],
    toggles: [],
  };

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

  addToggle(cb: (toggle: MockToggleComponent) => void): this {
    const toggleRecord: RenderedToggle = { value: false, onChange: async () => {} };
    cb(new MockToggleComponent(toggleRecord));
    this.record.toggles.push(toggleRecord);
    return this;
  }
}