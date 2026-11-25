import { describe, expect, it } from 'vitest';
import { type PostSummaryDraft } from '../generate-post-summary.prompt';
import { HangulRatioGate } from '../hangul-ratio.gate';

const gate = new HangulRatioGate({ minPercent: 30 });

describe('HangulRatioGate', () => {
  it('기준이 0~100 정수가 아니면 만들 때 던진다', () => {
    expect(() => new HangulRatioGate({ minPercent: 0.3 })).toThrow('minPercent must be an integer from 0 to 100: 0.3');
  });

  it('한국어 요약은 통과한다', () => {
    const draft = buildDraft({ sentences: ['Redux는 Flux의 단방향 데이터 흐름을 가져온 상태 관리 라이브러리다.'] });

    expect(gate.judge(draft).passed).toBe(true);
  });

  it('영어 요약은 실패한다', () => {
    const draft = buildDraft({ sentences: ['Retry metadata propagation shares the attempt count across the call chain.'] });

    expect(gate.judge(draft)).toEqual({ passed: false, explanation: '한글 비율 0%' });
  });

  it('백틱 안의 코드는 세지 않는다', () => {
    const draft = buildDraft({ sentences: ['`useEffect(() => {}, [deps])`와 `useLayoutEffect`를 구분한다.'] });

    expect(gate.judge(draft).explanation).toBe('한글 비율 100%');
  });

  it('반올림하기 전의 비율로 판정한다', () => {
    const draft = buildDraft({ sentences: [`${'가'.repeat(296)}${'a'.repeat(704)}`] });

    expect(gate.judge(draft)).toEqual({ passed: false, explanation: '한글 비율 30%' });
  });

  it('한글 비율이 기준과 정확히 같으면 통과한다', () => {
    const draft = buildDraft({ sentences: [`${'가'.repeat(29)}${'a'.repeat(71)}`] });

    expect(new HangulRatioGate({ minPercent: 29 }).judge(draft)).toEqual({ passed: true, explanation: '한글 비율 29%' });
  });

  it('글자가 없으면 통과한다', () => {
    expect(gate.judge(buildDraft({ sentences: ['123.'] })).passed).toBe(true);
  });
});

function buildDraft(overrides: Partial<PostSummaryDraft>): PostSummaryDraft {
  return { body: '', text: '', model: 'claude-haiku-5-5', finishReason: 'completed', sentences: [], ...overrides };
}
