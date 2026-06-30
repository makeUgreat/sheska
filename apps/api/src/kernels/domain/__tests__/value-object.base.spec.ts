import { err, ok, type Result } from '@core/result';
import {
  ValueObject,
  type DomainFailure,
  type DomainPrimitive,
} from '@kernels/domain';
import { describe, expect, it } from 'vitest';

const sampleEmptyError: DomainFailure = {
  kind: 'invariant_violation',
  code: 'sample.empty',
  message: 'Sample cannot be empty',
  details: { fields: ['value'] },
};

class SampleName extends ValueObject<string> {
  static of(value: string): Result<SampleName, DomainFailure> {
    const props = { value: value.trim() };

    if (SampleName.isEmpty(props)) {
      return err(sampleEmptyError);
    }

    return ok(new SampleName(props));
  }

  constructor(props: DomainPrimitive<string>) {
    super(props);
  }

  protected validate(props: DomainPrimitive<string>): void {
    if (SampleName.isEmpty(props)) {
      throw new Error('Sample cannot be empty');
    }
  }

  private static isEmpty(props: DomainPrimitive<string>): boolean {
    return props.value.length === 0;
  }
}

interface SampleDetailsProps {
  label: string;
  nested: {
    count: number;
  };
}

interface SampleValueKeyProps {
  value: string;
  label: string;
}

class SampleValueKeyDetails extends ValueObject<SampleValueKeyProps> {
  static of(
    props: SampleValueKeyProps,
  ): Result<SampleValueKeyDetails, DomainFailure> {
    return ok(new SampleValueKeyDetails(props));
  }

  constructor(props: SampleValueKeyProps) {
    super(props);
  }

  protected validate(_props: SampleValueKeyProps): void {}
}

class ConfigurableDetails extends ValueObject<SampleDetailsProps> {
  static constructedCount = 0;

  static of(
    props: SampleDetailsProps,
    options?: {
      validate?: (
        valueObjectProps: SampleDetailsProps,
      ) => Result<SampleDetailsProps, DomainFailure>;
    },
  ): Result<ConfigurableDetails, DomainFailure> {
    const validate =
      options?.validate ?? ((valueObjectProps) => ok(valueObjectProps));

    return validate(props).map((props) => new ConfigurableDetails(props));
  }

  constructor(props: SampleDetailsProps) {
    super(props);
    ConfigurableDetails.constructedCount += 1;
  }

  protected validate(_props: SampleDetailsProps): void {}
}

describe('ValueObject', () => {
  describe('constructor/of', () => {
    it('of validation을 통과하면 value object를 담은 성공 Result를 반환한다', () => {
      const result = SampleName.of('  spring  ');

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.unpack()).toBe('spring');
      }
    });

    it('of validation이 실패하면 throw 없이 실패 Result를 반환한다', () => {
      const result = SampleName.of(' ');

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBe(sampleEmptyError);
      }
    });

    it('of validation이 실패하면 value object를 생성하지 않는다', () => {
      ConfigurableDetails.constructedCount = 0;

      ConfigurableDetails.of(
        {
          label: 'spring',
          nested: {
            count: 1,
          },
        },
        {
          validate: () => err(sampleEmptyError),
        },
      );

      expect(ConfigurableDetails.constructedCount).toBe(0);
    });

    it('constructor validation이 실패하면 throw한다', () => {
      expect(() => new SampleName({ value: '' })).toThrow(
        'Sample cannot be empty',
      );
    });

    it.each<[string, unknown]>([
      ['null', null],
      ['undefined', undefined],
    ])('constructor props가 %s이면 throw한다', (_caseName, props) => {
      expect(() => new SampleName(props as DomainPrimitive<string>)).toThrow(
        'Value object props cannot be empty',
      );
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
        expect(result.value.unpack()).toBe('spring');
      }
    });

    it('value key가 있는 composite props를 primitive wrapper로 취급하지 않는다', () => {
      const result = SampleValueKeyDetails.of({
        value: 'spring',
        label: 'season',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.unpack()).toEqual({
          value: 'spring',
          label: 'season',
        });
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
