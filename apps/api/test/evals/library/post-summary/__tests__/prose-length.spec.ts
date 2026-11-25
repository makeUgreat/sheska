import { describe, expect, it } from 'vitest';
import { toProseLength } from '../prose-length';

describe('toProseLength', () => {
  it('코드 블록을 세지 않는다', () => {
    expect(toProseLength('가나다\n```ts\nconst a = 1;\n```\n라마')).toBe('가나다 라마'.length);
  });

  it('헤딩 줄을 세지 않는다', () => {
    expect(toProseLength('# 제목\n본문')).toBe('본문'.length);
  });

  it('링크는 보이는 글자만 센다', () => {
    expect(toProseLength('[RFC 7396](https://example.com)와 [[노트|별칭]]')).toBe('RFC 7396와 별칭'.length);
  });

  it('이미지 임베드를 세지 않는다', () => {
    expect(toProseLength('앞 ![[image.png]] ![alt](a.png) 뒤')).toBe('앞 뒤'.length);
  });

  it('연속된 공백은 한 칸으로 센다', () => {
    expect(toProseLength('가\n\n\n나   다')).toBe('가 나 다'.length);
  });
});
