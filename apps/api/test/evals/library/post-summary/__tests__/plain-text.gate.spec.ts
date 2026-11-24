import { describe, expect, it } from 'vitest';
import { PLAIN_TEXT_GATE } from '../plain-text.gate';

describe('PLAIN_TEXT_GATE', () => {
  it('평문 문장만 있으면 통과한다', () => {
    expect(PLAIN_TEXT_GATE.judge(['캐시는 무효화 시점의 문제다.', 'TTL은 보조 장치다.'])).toEqual({ passed: true, explanation: '' });
  });

  it.each([
    ['수식', '복잡도를 $N \\times M$에서 줄인다.', '1번 문장: math'],
    ['굵은 글씨', '**Negative Cache**를 도입한다.', '1번 문장: bold'],
    ['위키 링크', '[[OR 조건]]과 이어진다.', '1번 문장: wikilink'],
    ['마크다운 링크', '[RFC 7396](https://example.com)을 따른다.', '1번 문장: link'],
  ])('%s 문법이 있으면 실패한다', (_, sentence, explanation) => {
    expect(PLAIN_TEXT_GATE.judge([sentence])).toEqual({ passed: false, explanation });
  });

  it('실패한 문장의 번호를 알린다', () => {
    expect(PLAIN_TEXT_GATE.judge(['평문이다.', '$O(n)$이다.', '**굵다**.']).explanation).toBe('2번 문장: math, 3번 문장: bold');
  });

  it('백틱은 통과한다', () => {
    expect(PLAIN_TEXT_GATE.judge(['`@theme` 지시어로 토큰을 정의한다.']).passed).toBe(true);
  });

  it('달러 금액은 수식으로 보지 않는다', () => {
    expect(PLAIN_TEXT_GATE.judge(['요금은 $10에서 $20으로 오른다.']).passed).toBe(true);
  });
});
