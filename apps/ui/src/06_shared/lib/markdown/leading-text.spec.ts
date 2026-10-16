import { describe, expect, it } from 'vitest';
import { leadingText } from './leading-text';

describe('leadingText', () => {
  it('heading과 code fence를 건너뛰고 문단만 이어 붙인다', () => {
    const body = [
      '# 제목',
      '',
      '첫 문단.',
      '',
      '```ts',
      'const a = 1;',
      '```',
      '',
      '둘째 문단.',
    ].join('\n');

    expect(leadingText(body, 100)).toBe('첫 문단. 둘째 문단.');
  });

  it('wiki link는 화면에 보이는 label로 읽는다', () => {
    expect(leadingText('[[target|보이는 이름]]을 본다.', 100)).toBe(
      '보이는 이름을 본다.',
    );
  });

  it('길이를 넘으면 자르고 말줄임표를 붙인다', () => {
    expect(leadingText('abcdefghij', 4)).toBe('abcd…');
  });

  it('문단이 없으면 빈 문자열을 돌려준다', () => {
    expect(leadingText('## 제목만', 100)).toBe('');
  });
});
