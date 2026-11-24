import { describe, expect, it } from 'vitest';
import { toSentenceLimit } from '../sentence-limit';

const proseOf = (length: number) => '가'.repeat(length);

describe('toSentenceLimit', () => {
  it.each([
    [240, 1],
    [377, 2],
    [608, 3],
    [954, 4],
    [1201, 5],
  ])('산문 %i자이면 %i문장까지 허용한다', (length, limit) => {
    expect(toSentenceLimit(proseOf(length))).toBe(limit);
  });

  it('아주 짧은 글도 1문장은 허용한다', () => {
    expect(toSentenceLimit(proseOf(10))).toBe(1);
  });

  it('긴 글도 5문장을 넘지 않는다', () => {
    expect(toSentenceLimit(proseOf(30_000))).toBe(5);
  });

  it('코드 블록은 길이에 넣지 않는다', () => {
    expect(toSentenceLimit(`${proseOf(240)}\n\`\`\`ts\n${'x'.repeat(5000)}\n\`\`\``)).toBe(1);
  });
});
