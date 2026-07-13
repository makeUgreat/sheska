import { describe, expect, it } from 'vitest';
import { APPLICATION_ERROR_KIND } from '../error.base';
import { ApplicationException } from '../application.exception';
import { toErrorLogContext } from '../error-log-context';

describe('toErrorLogContext', () => {
  it('일반 Error의 이름과 메시지를 로그 context로 변환한다', () => {
    const error = new TypeError('Unexpected value');

    expect(toErrorLogContext(error)).toEqual({
      errorName: 'TypeError',
      error: 'Unexpected value',
    });
  });

  it('구조화된 exception의 kind와 code를 로그 context에 포함한다', () => {
    const exception = new ApplicationException({
      kind: APPLICATION_ERROR_KIND.NOT_FOUND,
      code: 'source.not_found',
      message: 'Source not found',
      details: { sourceId: 'source-1' },
    });

    expect(toErrorLogContext(exception)).toEqual({
      errorName: 'ApplicationException',
      error: 'Source not found',
      kind: APPLICATION_ERROR_KIND.NOT_FOUND,
      code: 'source.not_found',
      details: { sourceId: 'source-1' },
    });
  });

  it('exception 내부 error shape으로 error 메시지를 덮어쓰지 않는다', () => {
    const exception = new ApplicationException({
      kind: APPLICATION_ERROR_KIND.NOT_FOUND,
      code: 'source.not_found',
      message: 'Source not found',
      details: undefined,
    });

    expect(toErrorLogContext(exception)).toMatchObject({
      error: 'Source not found',
    });
  });
});
