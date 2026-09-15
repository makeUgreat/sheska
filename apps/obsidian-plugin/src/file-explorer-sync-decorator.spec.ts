import { beforeEach, describe, expect, it } from 'vitest';
import {
  FileExplorerSyncDecorator,
  type FileExplorerSyncStatus,
} from '@/file-explorer-sync-decorator';

class FakeClassList {
  private readonly values = new Set<string>();

  add(value: string): void {
    this.values.add(value);
  }

  contains(value: string): boolean {
    return this.values.has(value);
  }
}

class FakeBadge {
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly classList = new FakeClassList();
  parent: FakeTitle | null = null;

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  remove(): void {
    this.parent?.removeBadge(this);
    this.parent = null;
  }
}

class FakeTitle {
  readonly dataset: Record<string, string>;
  readonly badges: FakeBadge[] = [];

  constructor(
    path: string,
    readonly ownerDocument: FakeDocument,
  ) {
    this.dataset = { path };
  }

  querySelector(): FakeBadge | null {
    return this.badges[0] ?? null;
  }

  appendChild(badge: FakeBadge): FakeBadge {
    badge.parent = this;
    this.badges.push(badge);
    return badge;
  }

  removeBadge(badge: FakeBadge): void {
    const index = this.badges.indexOf(badge);
    if (index >= 0) this.badges.splice(index, 1);
  }
}

class FakeDocument {
  readonly body = null;
  readonly defaultView = null;
  readonly titles: FakeTitle[] = [];

  createElement(): FakeBadge {
    return new FakeBadge();
  }

  querySelectorAll(selector: string): Array<FakeTitle | FakeBadge> {
    if (selector === '.sheska-sync-badge') {
      return this.titles.flatMap((title) => title.badges);
    }
    return this.titles;
  }
}

describe('FileExplorerSyncDecorator', () => {
  let root: FakeDocument;
  let statuses: Record<string, FileExplorerSyncStatus | null>;
  let decorator: FileExplorerSyncDecorator;

  beforeEach(() => {
    root = new FakeDocument();
    root.titles.push(new FakeTitle('note.md', root));
    statuses = { 'note.md': 'accepted' };
    decorator = new FileExplorerSyncDecorator(
      (path) => statuses[path] ?? null,
      root as unknown as Document,
    );
  });

  it('renders the matching status badge beside a file title', () => {
    decorator.renderAll();

    const [badge] = root.titles[0].badges;
    expect(badge.dataset.status).toBe('accepted');
    expect(badge.attributes.get('data-icon')).toBe('clock');
    expect(badge.attributes.get('title')).toBe('Sheska: Queued');
  });

  it('updates an existing badge instead of appending a duplicate', () => {
    decorator.renderAll();
    statuses['note.md'] = 'failed';

    decorator.render('note.md');

    expect(root.titles[0].badges).toHaveLength(1);
    expect(root.titles[0].badges[0].dataset.status).toBe('failed');
    expect(root.titles[0].badges[0].attributes.get('data-icon')).toBe(
      'alert-triangle',
    );
  });

  it('removes the badge when the file no longer has a sync status', () => {
    decorator.renderAll();
    statuses['note.md'] = null;

    decorator.render('note.md');

    expect(root.titles[0].badges).toHaveLength(0);
  });

  it('removes all badges when destroyed', () => {
    decorator.renderAll();

    decorator.destroy();

    expect(root.titles[0].badges).toHaveLength(0);
  });

  it('renders the manual-attention state as a warning badge', () => {
    statuses['note.md'] = 'needs-attention';

    decorator.renderAll();

    const [badge] = root.titles[0].badges;
    expect(badge.attributes.get('data-icon')).toBe('alert-octagon');
    expect(badge.attributes.get('title')).toBe('Sheska: Needs attention');
  });
});
