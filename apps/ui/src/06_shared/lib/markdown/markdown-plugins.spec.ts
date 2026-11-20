import { describe, it, expect } from 'vitest';
import { hasCodeBlock, hasMath, parseMarkdown } from './markdown-plugins';

function readsCodeBlock(body: string) {
  return hasCodeBlock(parseMarkdown(body));
}

describe('hasCodeBlock', () => {
  it('fence가 없으면 code block이 없다고 본다', () => {
    expect(readsCodeBlock('본문과 `inline code`')).toBe(false);
  });

  it('목록 항목 안의 fence도 code block으로 본다', () => {
    expect(readsCodeBlock(['- item', '', '    ```js', '    const a = 1', '    ```'].join('\n'))).toBe(true);
  });

  it('callout 안의 fence도 code block으로 본다', () => {
    expect(readsCodeBlock(['> [!note]', '> ```ts', '> x', '> ```'].join('\n'))).toBe(true);
  });
});

function readsMath(body: string) {
  return hasMath(parseMarkdown(body));
}

describe('hasMath', () => {
  it('`$`로 감싼 inline 수식을 수식으로 본다', () => {
    expect(readsMath('관계 수는 $1:N$이다')).toBe(true);
  });

  it('`$$` block 수식을 수식으로 본다', () => {
    expect(readsMath(['$$', 'a \\cdot b', '$$'].join('\n'))).toBe(true);
  });

  it('닫는 `$`가 없는 금액은 수식으로 보지 않는다', () => {
    expect(readsMath('외부 API 비용 $0 — 추가 과금 없음')).toBe(false);
  });

  it('inline code 안의 `$`는 수식으로 보지 않는다', () => {
    expect(readsMath('`UPDATE agent SET balance = balance + $delta WHERE id=$id`')).toBe(false);
  });
});
