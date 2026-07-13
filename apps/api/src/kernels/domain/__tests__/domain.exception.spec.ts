import {
  DomainException,
  DOMAIN_ERROR_KIND,
  type DomainErrorOf,
} from '@kernels/domain';
import { describe, expect, it } from 'vitest';

type SampleInvariantViolation = DomainErrorOf<
  typeof DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  'sample',
  'empty_name'
>;

const sampleInvariantViolation: SampleInvariantViolation = {
  kind: DOMAIN_ERROR_KIND.INVARIANT_VIOLATION,
  code: 'sample.empty_name',
  message: 'Name cannot be empty',
  details: { fields: ['name'] },
};

describe('DomainException', () => {
  it('전체 형태', () => {
    const exception = new DomainException(sampleInvariantViolation);
    expect(exception.name).toBe('DomainException');
    expect(exception.message).toBe('Name cannot be empty');
    expect(exception.kind).toBe(DOMAIN_ERROR_KIND.INVARIANT_VIOLATION);
    expect(exception.code).toBe('sample.empty_name');
  });

  describe('instanceof', () => {
    it('Error의 instance다', () => {
      const exception = new DomainException(sampleInvariantViolation);

      expect(exception).toBeInstanceOf(Error);
    });

    it('DomainException의 instance다', () => {
      const exception = new DomainException(sampleInvariantViolation);

      expect(exception).toBeInstanceOf(DomainException);
    });
  });

  describe('message', () => {
    it('error.message를 Exception message로 사용한다', () => {
      const exception = new DomainException(sampleInvariantViolation);

      expect(exception.message).toBe(sampleInvariantViolation.message);
    });
  });

  describe('name', () => {
    it('name이 DomainException이다', () => {
      const exception = new DomainException(sampleInvariantViolation);

      expect(exception.name).toBe('DomainException');
    });
  });

  describe('구조화된 필드', () => {
    it('kind로 실패 종류를 식별한다', () => {
      const exception = new DomainException(sampleInvariantViolation);

      expect(exception.kind).toBe(DOMAIN_ERROR_KIND.INVARIANT_VIOLATION);
    });

    it('code로 실패를 안정적으로 식별한다', () => {
      const exception = new DomainException(sampleInvariantViolation);

      expect(exception.code).toBe('sample.empty_name');
    });

    it('details로 구조화된 메타데이터를 보관한다', () => {
      const exception = new DomainException(sampleInvariantViolation);

      expect(exception.details).toEqual({ fields: ['name'] });
    });
  });
});

describe('DOMAIN_ERROR_KIND', () => {
  it.each([
    ['INVARIANT_VIOLATION', 'invariant_violation'],
    ['STATE_CONFLICT', 'state_conflict'],
    ['OPERATION_NOT_ALLOWED', 'operation_not_allowed'],
  ] as const)('%s의 값은 %s다', (key, expectedValue) => {
    expect(DOMAIN_ERROR_KIND[key]).toBe(expectedValue);
  });
});
