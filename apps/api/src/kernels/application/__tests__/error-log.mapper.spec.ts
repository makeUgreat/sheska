import { describe, expect, it } from 'vitest';
import { toErrorLogContext } from '../error-log.mapper';
import { NotFoundError, UnavailableError } from '@core/errors';

describe('toErrorLogContext', () => {
  it('일반 Error의 이름과 메시지를 로그 context로 변환한다', () => {
    const error = new TypeError('Unexpected value');

    expect(toErrorLogContext(error)).toEqual({
      errorName: 'TypeError',
      error: 'Unexpected value',
      failure: { stack: expect.any(String) as string },
    });
  });

  it('구조화된 error의 kind와 code를 로그 context에 포함한다', () => {
    const error = new NotFoundError({
      code: 'source.not_found',
      message: 'Source not found',
      details: { sourceId: 'source-1' },
    });

    expect(toErrorLogContext(error)).toEqual({
      errorName: 'NotFoundError',
      error: 'Source not found',
      kind: 'not_found',
      code: 'source.not_found',
      details: { sourceId: 'source-1' },
      failure: { stack: expect.any(String) as string },
    });
  });

  it('어댑터가 붙인 source를 로그 context에 포함한다', () => {
    const error = new NotFoundError({
      code: 'source.not_found',
      message: 'Source not found',
      details: { sourceId: 'source-1' },
    });

    expect(toErrorLogContext(error)).toMatchObject({});
  });

  it('cause가 Error이면 직렬화 가능한 shape으로 변환한다', () => {
    const rootCause = new Error('connect ECONNREFUSED');
    const cause = new TypeError('fetch failed', { cause: rootCause });

    const error = new UnavailableError({
      code: 'service.request_failed',
      message: 'service unavailable',
      details: {},
      cause,
    });

    expect(toErrorLogContext(error)).toEqual({
      errorName: 'UnavailableError',
      error: 'service unavailable',
      kind: 'unavailable',
      code: 'service.request_failed',
      details: {},
      failure: { stack: expect.any(String) as string },
      cause: {
        name: 'TypeError',
        message: 'fetch failed',
        cause: {
          name: 'Error',
          message: 'connect ECONNREFUSED',
        },
      },
    });
  });

  describe('failure.stack', () => {
    it('예외 자신의 stack을 포함한다', () => {
      const error = new Error('boom');

      const context = toErrorLogContext(error);
      const err = context.failure as { stack: string };

      expect(err.stack).toContain('Error: boom');
    });

    it('cause 체인의 stack까지 이어붙인다', () => {
      const rootCause = new Error('connection refused');
      const error = new Error('query failed', { cause: rootCause });

      const context = toErrorLogContext(error);
      const err = context.failure as { stack: string };

      expect(err.stack).toContain('Error: query failed');
      expect(err.stack).toContain('caused by:');
      expect(err.stack).toContain('Error: connection refused');
    });

    it('순환 참조가 있어도 무한루프 없이 종료한다', () => {
      const error = new Error('circular');
      Object.assign(error, { cause: error });

      const context = toErrorLogContext(error);
      const err = context.failure as { stack: string };

      expect(err.stack).toContain('Error: circular');
    });
  });
});
