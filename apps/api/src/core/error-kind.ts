// 이 프로젝트의 단일 error kind 어휘. 같은 실패 의미에 같은 문자열을 쓰기 위해 여기에서만 정의한다.
// 각 kernel 레이어는 이 어휘의 부분집합을 view로 노출하고 경계 정책은 이 어휘 전체를 기준으로 결정한다.
export const ERROR_KIND = {
  INVARIANT_VIOLATION: 'invariant_violation',
  VALIDATION_FAILED: 'validation_failed',
  NOT_FOUND: 'not_found',
  STATE_CONFLICT: 'state_conflict',
  CONSTRAINT_VIOLATION: 'constraint_violation',
  CONCURRENCY_CONFLICT: 'concurrency_conflict',
  UNAVAILABLE: 'unavailable',
  TIMEOUT: 'timeout',
  INVALID_DATA: 'invalid_data',
  BAD_RESPONSE: 'bad_response',
  UNEXPECTED: 'unexpected',
} as const;

export type ErrorKind = (typeof ERROR_KIND)[keyof typeof ERROR_KIND];
