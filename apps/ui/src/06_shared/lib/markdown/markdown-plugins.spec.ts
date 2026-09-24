import { describe, it, expect } from 'vitest';
import { hasCodeBlock, parseMarkdown } from './markdown-plugins';

function readsCodeBlock(body: string) {
  return hasCodeBlock(parseMarkdown(body));
}

describe('hasCodeBlock', () => {
  it('fence가 없으면 code block이 없다고 본다', () => {
    expect(readsCodeBlock('본문과 `inline code`')).toBe(false);
  });

  it('목록 항목 안의 fence도 code block으로 본다', () => {
    expect(
      readsCodeBlock(
        ['- item', '', '    ```js', '    const a = 1', '    ```'].join('\n'),
      ),
    ).toBe(true);
  });

  it('callout 안의 fence도 code block으로 본다', () => {
    expect(
      readsCodeBlock(['> [!note]', '> ```ts', '> x', '> ```'].join('\n')),
    ).toBe(true);
  });
});
