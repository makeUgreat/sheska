import { describe, expect, it } from 'vitest';
import { toProseLength } from '../prose-length';

describe('toProseLength', () => {
  it.each([
    { name: '코드 블록을 세지 않는다', body: '가나다\n```ts\nconst a = 1;\n```\n라마', prose: '가나다 라마' },
    { name: '헤딩 줄을 세지 않는다', body: '# 제목\n본문', prose: '본문' },
    { name: '링크는 보이는 글자만 센다', body: '[RFC 7396](https://example.com)와 [[노트|별칭]]', prose: 'RFC 7396와 별칭' },
    { name: '이미지 임베드를 세지 않는다', body: '앞 ![[image.png]] ![alt](a.png) 뒤', prose: '앞 뒤' },
    { name: '연속된 공백은 한 칸으로 센다', body: '가\n\n\n나   다', prose: '가 나 다' },
  ])('$name', ({ body, prose }) => {
    expect(toProseLength(body)).toBe(prose.length);
  });
});
