import { describe, expect, it } from 'vitest';
import { INFRASTRUCTURE_ERROR_KIND } from '../error.base';
import { InfrastructureException } from '../infrastructure.exception';
import { classifyInfrastructureRetry } from '../retry-error.classifier';

function buildException(
  kind: (typeof INFRASTRUCTURE_ERROR_KIND)[keyof typeof INFRASTRUCTURE_ERROR_KIND],
  details: Record<string, unknown> = {},
): InfrastructureException {
  return new InfrastructureException({
    kind,
    code: 'test.error',
    source: { boundary: 'http-client', adapter: 'test' },
    message: 'test error',
    details,
  });
}

describe('classifyInfrastructureRetry', () => {
  it('TIMEOUT은 재시도 가능하다', () => {
    expect(
      classifyInfrastructureRetry(
        buildException(INFRASTRUCTURE_ERROR_KIND.TIMEOUT),
      ),
    ).toEqual({ retryable: true });
  });

  it('UNAVAILABLE은 재시도 가능하다', () => {
    expect(
      classifyInfrastructureRetry(
        buildException(INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE),
      ),
    ).toEqual({ retryable: true });
  });

  it.each([429, 500, 502, 503, 504])(
    'BAD_RESPONSE statusCode %d는 재시도 가능하다',
    (statusCode) => {
      expect(
        classifyInfrastructureRetry(
          buildException(INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE, {
            statusCode,
          }),
        ),
      ).toEqual({ retryable: true, retryAfterMs: undefined });
    },
  );

  it('BAD_RESPONSE의 retryAfterMs를 그대로 전달한다', () => {
    expect(
      classifyInfrastructureRetry(
        buildException(INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE, {
          statusCode: 429,
          retryAfterMs: 5_000,
        }),
      ),
    ).toEqual({ retryable: true, retryAfterMs: 5_000 });
  });

  it.each([400, 401, 403, 404])(
    'BAD_RESPONSE statusCode %d는 재시도 불가하다',
    (statusCode) => {
      expect(
        classifyInfrastructureRetry(
          buildException(INFRASTRUCTURE_ERROR_KIND.BAD_RESPONSE, {
            statusCode,
          }),
        ),
      ).toEqual({ retryable: false });
    },
  );

  it.each([
    INFRASTRUCTURE_ERROR_KIND.INVALID_DATA,
    INFRASTRUCTURE_ERROR_KIND.CONFLICT,
    INFRASTRUCTURE_ERROR_KIND.NOT_FOUND,
    INFRASTRUCTURE_ERROR_KIND.RESTORE_FAILED,
    INFRASTRUCTURE_ERROR_KIND.UNEXPECTED,
    INFRASTRUCTURE_ERROR_KIND.CIRCUIT_OPEN,
  ])('%s kind는 재시도 불가하다', (kind) => {
    expect(classifyInfrastructureRetry(buildException(kind))).toEqual({
      retryable: false,
    });
  });

  it('CONCURRENCY_CONFLICT은 전체 트랜잭션 재시작이 필요해 이 범용 classifier로는 재시도 불가로 처리한다', () => {
    expect(
      classifyInfrastructureRetry(
        buildException(INFRASTRUCTURE_ERROR_KIND.CONCURRENCY_CONFLICT),
      ),
    ).toEqual({ retryable: false });
  });

  it('InfrastructureException이 아닌 에러는 재시도 불가하다', () => {
    expect(classifyInfrastructureRetry(new Error('plain error'))).toEqual({
      retryable: false,
    });
    expect(classifyInfrastructureRetry('not an error')).toEqual({
      retryable: false,
    });
  });
});
