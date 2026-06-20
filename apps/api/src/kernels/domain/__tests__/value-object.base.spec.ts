import { err, ok, type Result } from '@core/result';
import {
  ValueObject,
  type DomainError,
  type DomainPrimitive,
} from '@kernels/domain';
import { describe, expect, it, vi } from 'vitest';

const sampleEmptyError: DomainError = {
  kind: 'invariant_violation',
  code: 'sample.empty',
  message: 'Sample cannot be empty',
  details: { fields: ['value'] },
};

class SampleName extends ValueObject<string> {
  static of(value: string): Result<SampleName, DomainError> {
    return super.construct({
      props: { value: value.trim() },
      validate: (props) => SampleName.validateProps(props),
      instantiate: (props) => new SampleName(props),
    });
  }

  private constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  private static validateProps(
    props: DomainPrimitive<string>,
  ): Result<DomainPrimitive<string>, DomainError> {
    if (props.value.length === 0) {
      return err(sampleEmptyError);
    }

    return ok(props);
  }
}

class SampleDate extends ValueObject<Date> {
  static of(value: Date): Result<SampleDate, DomainError> {
    return super.construct({
      props: { value },
      validate: (props) => ok(props),
      instantiate: (props) => new SampleDate(props),
    });
  }

  private constructor(props: DomainPrimitive<Date>) {
    super(props);
  }
}

interface SampleDetailsProps {
  label: string;
  nested: {
    count: number;
  };
}

class SampleDetails extends ValueObject<SampleDetailsProps> {
  static of(props: SampleDetailsProps): Result<SampleDetails, DomainError> {
    return super.construct({
      props,
      validate: (valueObjectProps) => ok(valueObjectProps),
      instantiate: (valueObjectProps) => new SampleDetails(valueObjectProps),
    });
  }

  private constructor(props: SampleDetailsProps) {
    super(props);
  }
}

interface SampleValueKeyProps {
  value: string;
  label: string;
}

class SampleValueKeyDetails extends ValueObject<SampleValueKeyProps> {
  static of(
    props: SampleValueKeyProps,
  ): Result<SampleValueKeyDetails, DomainError> {
    return super.construct({
      props,
      validate: (valueObjectProps) => ok(valueObjectProps),
      instantiate: (valueObjectProps) =>
        new SampleValueKeyDetails(valueObjectProps),
    });
  }

  private constructor(props: SampleValueKeyProps) {
    super(props);
  }
}

class ConfigurableDetails extends ValueObject<SampleDetailsProps> {
  static of(
    props: SampleDetailsProps,
    options?: {
      validate?: (
        valueObjectProps: SampleDetailsProps,
      ) => Result<SampleDetailsProps, DomainError>;
      instantiate?: (
        valueObjectProps: SampleDetailsProps,
      ) => ConfigurableDetails;
    },
  ): Result<ConfigurableDetails, DomainError> {
    return super.construct({
      props,
      validate:
        options?.validate ?? ((valueObjectProps) => ok(valueObjectProps)),
      instantiate:
        options?.instantiate ??
        ((valueObjectProps) => new ConfigurableDetails(valueObjectProps)),
    });
  }

  constructor(props: SampleDetailsProps) {
    super(props);
  }
}

describe('ValueObject', () => {
  describe('construct', () => {
    it('validation을 통과하면 value object를 담은 성공 Result를 반환한다', () => {
      const result = SampleName.of('  spring  ');

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.value).toBe('spring');
      }
    });

    it('validation이 실패하면 throw 없이 실패 Result를 반환한다', () => {
      const result = SampleName.of(' ');

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBe(sampleEmptyError);
      }
    });

    it('validation이 실패하면 instantiate를 호출하지 않는다', () => {
      const instantiate = vi.fn((props: SampleDetailsProps) => {
        return new ConfigurableDetails(props);
      });

      ConfigurableDetails.of(
        {
          label: 'spring',
          nested: {
            count: 1,
          },
        },
        {
          validate: () => err(sampleEmptyError),
          instantiate,
        },
      );

      expect(instantiate).not.toHaveBeenCalled();
    });
  });

  describe('isValueObject', () => {
    it('value object instance를 true로 판정한다', () => {
      const result = SampleName.of('spring');

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(ValueObject.isValueObject(result.value)).toBe(true);
      }
    });

    it.each<[string, unknown]>([
      ['plain object', { value: 'spring' }],
      ['null', null],
    ])('%s는 false로 판정한다', (_caseName, value) => {
      expect(ValueObject.isValueObject(value)).toBe(false);
    });
  });

  describe('value', () => {
    it('primitive value object의 primitive value를 반환한다', () => {
      const result = SampleName.of('spring');

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.value).toBe('spring');
      }
    });

    it('입력 Date 변경을 primitive value에 반영하지 않는다', () => {
      const input = new Date('2026-01-01T00:00:00.000Z');
      const result = SampleDate.of(input);

      input.setUTCFullYear(2030);

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.value).toEqual(
          new Date('2026-01-01T00:00:00.000Z'),
        );
      }
    });

    it('반환한 Date 변경을 내부 primitive value에 반영하지 않는다', () => {
      const result = SampleDate.of(new Date('2026-01-01T00:00:00.000Z'));

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const returnedValue = result.value.value;
        returnedValue.setUTCFullYear(2031);

        expect(result.value.value).toEqual(
          new Date('2026-01-01T00:00:00.000Z'),
        );
      }
    });

    it('원본 object의 top-level 변경을 반영하지 않는다', () => {
      const props = {
        label: 'spring',
        nested: {
          count: 1,
        },
      };
      const result = SampleDetails.of(props);

      props.label = 'summer';

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.value).toEqual({
          label: 'spring',
          nested: {
            count: 1,
          },
        });
      }
    });

    it('원본 object의 nested 변경을 반영하지 않는다', () => {
      const props = {
        label: 'spring',
        nested: {
          count: 1,
        },
      };
      const result = SampleDetails.of(props);

      props.nested.count = 2;

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.value).toEqual({
          label: 'spring',
          nested: {
            count: 1,
          },
        });
      }
    });

    it('value key가 있는 composite props를 primitive wrapper로 취급하지 않는다', () => {
      const result = SampleValueKeyDetails.of({
        value: 'spring',
        label: 'season',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.value).toEqual({
          value: 'spring',
          label: 'season',
        });
      }
    });

    it('composite props를 freeze한다', () => {
      const result = SampleDetails.of({
        label: 'spring',
        nested: {
          count: 1,
        },
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(() => {
          result.value.value.label = 'summer';
        }).toThrow(TypeError);
      }
    });

    it('중첩 object props를 freeze한다', () => {
      const result = SampleDetails.of({
        label: 'spring',
        nested: {
          count: 1,
        },
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(() => {
          result.value.value.nested.count = 2;
        }).toThrow(TypeError);
      }
    });
  });

  describe('equals', () => {
    it('같은 값을 가진 다른 value object를 true로 비교한다', () => {
      const first = SampleName.of('spring');
      const second = SampleName.of('spring');

      expect(first.isOk()).toBe(true);
      expect(second.isOk()).toBe(true);

      if (first.isOk() && second.isOk()) {
        expect(first.value.equals(second.value)).toBe(true);
      }
    });

    it('다른 값을 가진 다른 value object를 false로 비교한다', () => {
      const first = SampleName.of('spring');
      const second = SampleName.of('summer');

      expect(first.isOk()).toBe(true);
      expect(second.isOk()).toBe(true);

      if (first.isOk() && second.isOk()) {
        expect(first.value.equals(second.value)).toBe(false);
      }
    });

    it('비교 대상이 undefined이면 false를 반환한다', () => {
      const result = SampleName.of('spring');

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.equals()).toBe(false);
      }
    });

    it('비교 대상이 null이면 false를 반환한다', () => {
      const result = SampleName.of('spring');

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(
          result.value.equals(null as unknown as ValueObject<string>),
        ).toBe(false);
      }
    });
  });
});
