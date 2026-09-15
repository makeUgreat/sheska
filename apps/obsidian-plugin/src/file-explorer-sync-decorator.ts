import { setIcon } from 'obsidian';
import type { SyncCacheEntry } from '@/storage';

export type FileExplorerSyncStatus =
  | NonNullable<SyncCacheEntry['status']>
  | 'not-synced'
  | 'uploading';

interface SyncBadgePresentation {
  readonly icon: Parameters<typeof setIcon>[1];
  readonly label: string;
}

const BADGE_CLASS = 'sheska-sync-badge';
const FILE_TITLE_SELECTOR = '.nav-file-title[data-path]';

const BADGE_PRESENTATIONS: Record<
  FileExplorerSyncStatus,
  SyncBadgePresentation
> = {
  synced: { icon: 'check-circle', label: 'Sheska: Synced' },
  'not-synced': { icon: 'circle', label: 'Sheska: Not synced' },
  uploading: { icon: 'loader-2', label: 'Sheska: Uploading' },
  accepted: { icon: 'clock', label: 'Sheska: Queued' },
  processing: { icon: 'loader-2', label: 'Sheska: Syncing' },
  failed: { icon: 'alert-triangle', label: 'Sheska: Failed' },
  unknown: { icon: 'help-circle', label: 'Sheska: Status unknown' },
  retrying: { icon: 'refresh-cw', label: 'Sheska: Retrying' },
  'needs-attention': {
    icon: 'alert-octagon',
    label: 'Sheska: Needs attention',
  },
};

export class FileExplorerSyncDecorator {
  private observer: MutationObserver | null = null;
  private renderScheduled = false;

  constructor(
    private readonly getStatus: (path: string) => FileExplorerSyncStatus | null,
    private readonly root: Document | undefined = globalThis.document,
  ) {}

  start(): void {
    if (!this.root) return;
    this.renderAll();

    const Observer = this.root.defaultView?.MutationObserver;
    if (!Observer || !this.root.body) return;

    this.observer = new Observer((mutations) => {
      if (!mutations.some((mutation) => this.containsFileTitle(mutation))) {
        return;
      }
      this.scheduleRenderAll();
    });
    this.observer.observe(this.root.body, { childList: true, subtree: true });
  }

  render(path: string): void {
    if (!this.root) return;
    const status = this.getStatus(path);
    for (const title of this.root.querySelectorAll<HTMLElement>(
      FILE_TITLE_SELECTOR,
    )) {
      if (title.dataset.path === path) this.renderTitle(title, status);
    }
  }

  renderAll(): void {
    if (!this.root) return;
    for (const title of this.root.querySelectorAll<HTMLElement>(
      FILE_TITLE_SELECTOR,
    )) {
      const path = title.dataset.path;
      if (path) this.renderTitle(title, this.getStatus(path));
    }
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.renderScheduled = false;
    if (!this.root) return;
    for (const badge of this.root.querySelectorAll<HTMLElement>(
      `.${BADGE_CLASS}`,
    )) {
      badge.remove();
    }
  }

  private renderTitle(
    title: HTMLElement,
    status: FileExplorerSyncStatus | null,
  ): void {
    const existing = title.querySelector<HTMLElement>(`.${BADGE_CLASS}`);
    if (!status) {
      existing?.remove();
      return;
    }

    const presentation = BADGE_PRESENTATIONS[status];
    const badge = existing ?? title.ownerDocument.createElement('span');
    if (!existing) {
      badge.classList.add(BADGE_CLASS);
      title.appendChild(badge);
    }
    if (badge.dataset.status === status) return;

    badge.dataset.status = status;
    badge.setAttribute('aria-label', presentation.label);
    badge.setAttribute('title', presentation.label);
    setIcon(badge, presentation.icon);
  }

  private containsFileTitle(mutation: MutationRecord): boolean {
    const ElementConstructor = this.root?.defaultView?.Element;
    if (!ElementConstructor) return false;
    for (const node of mutation.addedNodes) {
      if (!(node instanceof ElementConstructor)) continue;
      if (
        node.matches(FILE_TITLE_SELECTOR) ||
        node.querySelector(FILE_TITLE_SELECTOR)
      ) {
        return true;
      }
    }
    return false;
  }

  private scheduleRenderAll(): void {
    if (this.renderScheduled) return;
    const view = this.root?.defaultView;
    if (!view) return;
    this.renderScheduled = true;
    view.requestAnimationFrame(() => {
      this.renderScheduled = false;
      this.renderAll();
    });
  }
}
