import {
  InfrastructureException,
  INFRASTRUCTURE_ERROR_KIND,
  type InfrastructureErrorOf,
} from '@kernels/infrastructure';
import { describe, expect, it } from 'vitest';

type SampleUnavailableError = InfrastructureErrorOf<
  typeof INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
  'sample',
  'db_unavailable'
>;

const sampleUnavailableError: SampleUnavailableError = {
  kind: INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE,
  code: 'sample.db_unavailable',
  source: { boundary: 'persistence', adapter: 'sample.drizzle' },
  message: 'Database is unavailable',
  details: {},
  cause: new Error('connection refused'),
};

describe('InfrastructureException', () => {
  it('전체 형태', () => {
    const exception = new InfrastructureException(sampleUnavailableError);

    expect(exception).toBeInstanceOf(Error);
    expect(exception).toBeInstanceOf(InfrastructureException);
    expect(exception.name).toBe('InfrastructureException');
    expect(exception.message).toBe('Database is unavailable');
    expect(exception.kind).toBe(INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE);
    expect(exception.code).toBe('sample.db_unavailable');
  });

  describe('instanceof', () => {
    it('Error의 instance다', () => {
      const exception = new InfrastructureException(sampleUnavailableError);

      expect(exception).toBeInstanceOf(Error);
    });

    it('InfrastructureException의 instance다', () => {
      const exception = new InfrastructureException(sampleUnavailableError);

      expect(exception).toBeInstanceOf(InfrastructureException);
    });
  });

  describe('message', () => {
    it('error.message를 Exception message로 사용한다', () => {
      const exception = new InfrastructureException(sampleUnavailableError);

      expect(exception.message).toBe(sampleUnavailableError.message);
    });
  });

  describe('name', () => {
    it('name이 InfrastructureException이다', () => {
      const exception = new InfrastructureException(sampleUnavailableError);

      expect(exception.name).toBe('InfrastructureException');
    });
  });

  describe('구조화된 필드', () => {
    it('kind로 실패 종류를 식별한다', () => {
      const exception = new InfrastructureException(sampleUnavailableError);

      expect(exception.kind).toBe(INFRASTRUCTURE_ERROR_KIND.UNAVAILABLE);
    });

    it('code로 실패를 안정적으로 식별한다', () => {
      const exception = new InfrastructureException(sampleUnavailableError);

      expect(exception.code).toBe('sample.db_unavailable');
    });

    it('source로 실패 위치를 식별한다', () => {
      const exception = new InfrastructureException(sampleUnavailableError);

      expect(exception.source).toEqual({
        boundary: 'persistence',
        adapter: 'sample.drizzle',
      });
    });

    it('details를 보관한다', () => {
      const exception = new InfrastructureException(sampleUnavailableError);

      expect(exception.details).toBe(sampleUnavailableError.details);
    });

    it('cause를 Error.cause로 전달한다', () => {
      const exception = new InfrastructureException(sampleUnavailableError);

      expect(exception.cause).toBe(sampleUnavailableError.cause);
    });
  });
});

describe('INFRASTRUCTURE_ERROR_KIND', () => {
  it.each([
    ['UNAVAILABLE', 'unavailable'],
    ['TIMEOUT', 'timeout'],
    ['CONFLICT', 'conflict'],
    ['INVALID_DATA', 'invalid_data'],
    ['RESTORE_FAILED', 'restore_failed'],
    ['BAD_RESPONSE', 'bad_response'],
    ['NOT_FOUND', 'not_found'],
    ['UNEXPECTED', 'unexpected'],
  ] as const)('%s의 값은 %s다', (key, expectedValue) => {
    expect(INFRASTRUCTURE_ERROR_KIND[key]).toBe(expectedValue);
  });
});
