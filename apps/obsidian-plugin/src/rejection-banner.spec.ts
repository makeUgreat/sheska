import { describe, expect, it } from 'vitest';
import { renderRejectionBanner } from '@/rejection-banner';

class FakeElement {
  className = '';
  textContent = '';
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  parent: FakeElement | null = null;

  constructor(readonly tagName: string) {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  append(child: FakeElement): void {
    child.parent = this;
    this.children.push(child);
  }

  remove(): void {
    if (!this.parent) return;
    this.parent.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = null;
  }

  text(): string {
    return [this.textContent, ...this.children.map((child) => child.text())].filter(Boolean).join(' | ');
  }
}

class FakeContainer {
  readonly children: FakeElement[] = [];
  readonly classes = new Set<string>();
  readonly classList = {
    toggle: (name: string, force: boolean) => (force ? this.classes.add(name) : this.classes.delete(name)),
  };
  readonly ownerDocument = { createElement: (tagName: string) => new FakeElement(tagName) };

  querySelector(selector: string): FakeElement | null {
    const className = selector.replace(':scope > .', '');
    return this.children.find((child) => child.className === className) ?? null;
  }

  prepend(child: FakeElement): void {
    child.parent = this as unknown as FakeElement;
    this.children.unshift(child);
  }

  banners(): FakeElement[] {
    return this.children.filter((child) => child.className === 'sheska-rejection-banner');
  }
}

function render(container: FakeContainer, rejection: Parameters<typeof renderRejectionBanner>[1]): void {
  renderRejectionBanner(container as unknown as HTMLElement, rejection);
}

describe('renderRejectionBanner', () => {
  it('puts the reason and code at the top of the note view', () => {
    const container = new FakeContainer();
    container.children.push(new FakeElement('div'));

    render(container, { code: 'source_document.invalid_yaml', message: 'Nested mappings are not allowed' });

    const [banner] = container.children;
    expect(banner.className).toBe('sheska-rejection-banner');
    expect(banner.attributes.get('role')).toBe('alert');
    expect(banner.text()).toBe(
      'Sheska rejected this note, so it is not synced. Fix it and save to upload again. | Nested mappings are not allowed | source_document.invalid_yaml',
    );
    expect(container.classes.has('sheska-has-rejection')).toBe(true);
  });

  it('leaves out the code when the server sent none', () => {
    const container = new FakeContainer();

    render(container, { message: 'HTTP 413' });

    expect(container.banners()[0].children.map((child) => child.tagName)).toEqual(['p', 'p']);
  });

  it('keeps the same banner when the reason has not changed', () => {
    const container = new FakeContainer();
    const rejection = { code: 'source.not_sync_target', message: 'Source frontmatter must have `sheska: true`' };

    render(container, rejection);
    const first = container.banners()[0];
    render(container, { ...rejection });

    expect(container.banners()).toEqual([first]);
  });

  it('replaces the banner when the reason changes', () => {
    const container = new FakeContainer();

    render(container, { code: 'a', message: 'first' });
    render(container, { code: 'b', message: 'second' });

    expect(container.banners()).toHaveLength(1);
    expect(container.banners()[0].text()).toContain('second');
  });

  it('removes the banner once the note is no longer rejected', () => {
    const container = new FakeContainer();

    render(container, { code: 'a', message: 'first' });
    render(container, null);

    expect(container.banners()).toEqual([]);
    expect(container.classes.has('sheska-has-rejection')).toBe(false);
  });
});
