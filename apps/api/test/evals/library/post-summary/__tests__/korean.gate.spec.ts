import { describe, expect, it } from 'vitest';
import { KOREAN_GATE } from '../korean.gate';

describe('KOREAN_GATE', () => {
  it('한국어 요약은 통과한다', () => {
    expect(KOREAN_GATE.judge(['Redux는 Flux의 단방향 데이터 흐름을 가져온 상태 관리 라이브러리다.']).passed).toBe(true);
  });

  it('영어 요약은 실패한다', () => {
    expect(KOREAN_GATE.judge(['Retry metadata propagation shares the attempt count across the call chain.'])).toEqual({
      passed: false,
      explanation: '한글 비율 0%',
    });
  });

  it('백틱 안의 코드는 세지 않는다', () => {
    expect(KOREAN_GATE.judge(['`useEffect(() => {}, [deps])`와 `useLayoutEffect`를 구분한다.']).explanation).toBe('한글 비율 100%');
  });

  it('글자가 없으면 통과한다', () => {
    expect(KOREAN_GATE.judge(['123.']).passed).toBe(true);
  });
});
