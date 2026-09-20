import { describe, expect, it } from 'vitest';
import {
  BadResponseError,
  ConcurrencyConflictError,
  ConstraintViolationError,
  ERROR_KIND,
  InvalidDataError,
  InvariantViolationError,
  NotFoundError,
  SheskaError,
  StateConflictError,
  TimeoutError,
  UnavailableError,
  UnexpectedError,
  ValidationFailedError,
} from '../errors';

const ERROR_CLASSES = [
  InvariantViolationError,
  ValidationFailedError,
  NotFoundError,
  StateConflictError,
  ConstraintViolationError,
  ConcurrencyConflictError,
  UnavailableError,
  TimeoutError,
  InvalidDataError,
  BadResponseError,
  UnexpectedError,
];

function buildSample(): NotFoundError {
  return new NotFoundError({
    code: 'source.not_found',
    message: 'Source not found',
    details: { id: 'source-1' },
  });
}

describe('ERROR_KIND', () => {
  it('서로 다른 이름이 같은 값을 갖지 않는다', () => {
    const values = Object.values(ERROR_KIND);

    expect(new Set(values).size).toBe(values.length);
  });

  it('모든 kind가 정확히 하나의 error 클래스에 대응한다', () => {
    const kinds = ERROR_CLASSES.map(
      (ErrorClass) =>
        new ErrorClass({
          code: 'sample.error',
          message: 'sample',
          details: { fields: [], statusCode: 500 },
        }).kind,
    );

    expect(new Set(kinds)).toEqual(new Set(Object.values(ERROR_KIND)));
    expect(kinds).toHaveLength(Object.values(ERROR_KIND).length);
  });
});

describe('SheskaError', () => {
  it('Error의 instance다', () => {
    expect(buildSample()).toBeInstanceOf(Error);
  });

  it('SheskaError의 instance다', () => {
    expect(buildSample()).toBeInstanceOf(SheskaError);
  });

  it('name이 구체 클래스 이름이다', () => {
    expect(buildSample().name).toBe('NotFoundError');
  });

  it('message를 Error message로 사용한다', () => {
    expect(buildSample().message).toBe('Source not found');
  });

  it('code로 실패를 안정적으로 식별한다', () => {
    expect(buildSample().code).toBe('source.not_found');
  });

  it('details로 구조화된 메타데이터를 보관한다', () => {
    expect(buildSample().details).toEqual({ id: 'source-1' });
  });

  it('cause를 Error를 통해 보존한다', () => {
    const cause = new Error('raw db error');
    const error = new UnexpectedError({
      code: 'source.get_failed',
      message: 'Source get operation failed',
      details: {},
      cause,
    });

    expect(error.cause).toBe(cause);
  });

  it('kind와 code만 흉내 낸 Error는 SheskaError가 아니다', () => {
    const lookalike = Object.assign(new Error('lookalike'), {
      kind: 'not_found',
      code: 'sample.not_found',
    });

    expect(lookalike).not.toBeInstanceOf(SheskaError);
  });
});
