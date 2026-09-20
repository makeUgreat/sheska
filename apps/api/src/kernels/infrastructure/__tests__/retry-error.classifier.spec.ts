import { describe, expect, it } from 'vitest';
import { classifyInfrastructureRetry } from '../retry-error.classifier';
import {
  BadResponseError,
  ConcurrencyConflictError,
  ConstraintViolationError,
  InvalidDataError,
  NotFoundError,
  TimeoutError,
  UnavailableError,
  UnexpectedError,
  type BadResponseDetails,
} from '@core/errors';

const ERROR_BASE = {
  code: 'test.error',
  message: 'test error',
  details: {},
} as const;

function buildBadResponseError(details: BadResponseDetails): BadResponseError {
  return new BadResponseError({ ...ERROR_BASE, details });
}

describe('classifyInfrastructureRetry', () => {
  it('TimeoutError는 재시도 가능하다', () => {
    expect(classifyInfrastructureRetry(new TimeoutError(ERROR_BASE))).toEqual({
      retryable: true,
    });
  });

  it('UnavailableError는 재시도 가능하다', () => {
    expect(
      classifyInfrastructureRetry(new UnavailableError(ERROR_BASE)),
    ).toEqual({ retryable: true });
  });

  it.each([429, 500, 502, 503, 504])(
    'BadResponseError statusCode %d는 재시도 가능하다',
    (statusCode) => {
      expect(
        classifyInfrastructureRetry(buildBadResponseError({ statusCode })),
      ).toEqual({ retryable: true, retryAfterMs: undefined });
    },
  );

  it('BadResponseError의 retryAfterMs를 그대로 전달한다', () => {
    expect(
      classifyInfrastructureRetry(
        buildBadResponseError({ statusCode: 429, retryAfterMs: 5_000 }),
      ),
    ).toEqual({ retryable: true, retryAfterMs: 5_000 });
  });

  it.each([400, 401, 403, 404])(
    'BadResponseError statusCode %d는 재시도 불가하다',
    (statusCode) => {
      expect(
        classifyInfrastructureRetry(buildBadResponseError({ statusCode })),
      ).toEqual({ retryable: false });
    },
  );

  it.each([
    new InvalidDataError({ ...ERROR_BASE, details: { fields: ['embedding'] } }),
    new ConstraintViolationError(ERROR_BASE),
    new NotFoundError(ERROR_BASE),
    new UnexpectedError(ERROR_BASE),
  ])('$name은 재시도 불가하다', (error) => {
    expect(classifyInfrastructureRetry(error)).toEqual({ retryable: false });
  });

  it('ConcurrencyConflictError는 전체 트랜잭션 재시작이 필요해 이 범용 classifier로는 재시도 불가로 처리한다', () => {
    expect(
      classifyInfrastructureRetry(new ConcurrencyConflictError(ERROR_BASE)),
    ).toEqual({ retryable: false });
  });

  it('이 프로젝트가 소유하지 않은 에러는 재시도 불가하다', () => {
    expect(classifyInfrastructureRetry(new Error('plain error'))).toEqual({
      retryable: false,
    });
    expect(classifyInfrastructureRetry('not an error')).toEqual({
      retryable: false,
    });
  });
});
