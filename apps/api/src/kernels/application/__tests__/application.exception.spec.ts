import {
  ApplicationException,
  APPLICATION_ERROR_KIND,
  type ApplicationErrorOf,
} from '@kernels/application';
import { describe, expect, it } from 'vitest';

type SampleNotFoundError = ApplicationErrorOf<
  typeof APPLICATION_ERROR_KIND.NOT_FOUND,
  'sample',
  'resource_not_found'
>;

const sampleNotFoundError: SampleNotFoundError = {
  kind: APPLICATION_ERROR_KIND.NOT_FOUND,
  code: 'sample.resource_not_found',
  message: 'Resource not found',
  details: undefined,
};

describe('ApplicationException', () => {
  it('전체 형태', () => {
    const exception = new ApplicationException(sampleNotFoundError);

    expect(exception).toBeInstanceOf(Error);
    expect(exception).toBeInstanceOf(ApplicationException);
    expect(exception.name).toBe('ApplicationException');
    expect(exception.message).toBe('Resource not found');
    expect(exception.kind).toBe(APPLICATION_ERROR_KIND.NOT_FOUND);
    expect(exception.code).toBe('sample.resource_not_found');
  });

  describe('instanceof', () => {
    it('Error의 instance다', () => {
      const exception = new ApplicationException(sampleNotFoundError);

      expect(exception).toBeInstanceOf(Error);
    });

    it('ApplicationException의 instance다', () => {
      const exception = new ApplicationException(sampleNotFoundError);

      expect(exception).toBeInstanceOf(ApplicationException);
    });
  });

  describe('message', () => {
    it('error.message를 Exception message로 사용한다', () => {
      const exception = new ApplicationException(sampleNotFoundError);

      expect(exception.message).toBe(sampleNotFoundError.message);
    });
  });

  describe('name', () => {
    it('name이 ApplicationException이다', () => {
      const exception = new ApplicationException(sampleNotFoundError);

      expect(exception.name).toBe('ApplicationException');
    });
  });

  describe('구조화된 필드', () => {
    it('kind로 실패 종류를 식별한다', () => {
      const exception = new ApplicationException(sampleNotFoundError);

      expect(exception.kind).toBe(APPLICATION_ERROR_KIND.NOT_FOUND);
    });

    it('code로 실패를 안정적으로 식별한다', () => {
      const exception = new ApplicationException(sampleNotFoundError);

      expect(exception.code).toBe('sample.resource_not_found');
    });
  });
});

describe('APPLICATION_ERROR_KIND', () => {
  it.each([
    ['VALIDATION_FAILED', 'validation_failed'],
    ['DEPENDENCY_UNAVAILABLE', 'dependency_unavailable'],
    ['NOT_FOUND', 'not_found'],
    ['STATE_CONFLICT', 'state_conflict'],
    ['PERMISSION_DENIED', 'permission_denied'],
    ['AUTHENTICATION_REQUIRED', 'authentication_required'],
    ['OPERATION_NOT_ALLOWED', 'operation_not_allowed'],
    ['RATE_LIMITED', 'rate_limited'],
  ] as const)('%s의 값은 %s다', (key, expectedValue) => {
    expect(APPLICATION_ERROR_KIND[key]).toBe(expectedValue);
  });
});
