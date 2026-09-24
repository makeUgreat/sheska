import { ValueObject, type DomainPrimitive } from '@kernels/domain';
import { describe, expect, it } from 'vitest';

class SampleName extends ValueObject<string> {
  static of(value: string): SampleName {
    return new SampleName({ value: value.trim() });
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
  static of(props: SampleValueKeyProps): SampleValueKeyDetails {
    return new SampleValueKeyDetails(props);
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
      validate?: (valueObjectProps: SampleDetailsProps) => void;
    },
  ): ConfigurableDetails {
    options?.validate?.(props);

    return new ConfigurableDetails(props);
  }

  constructor(props: SampleDetailsProps) {
    super(props);
    ConfigurableDetails.constructedCount += 1;
  }

  protected validate(_props: SampleDetailsProps): void {}
}

describe('ValueObject', () => {
  describe('constructor/of', () => {
    it('of validation을 통과하면 value object를 반환한다', () => {
      const sampleName = SampleName.of('  spring  ');

      expect(sampleName.unpack()).toBe('spring');
    });

    it('of validation이 실패하면 throw한다', () => {
      expect(() => SampleName.of(' ')).toThrow('Sample cannot be empty');
    });

    it('of validation이 실패하면 value object를 생성하지 않는다', () => {
      ConfigurableDetails.constructedCount = 0;

      expect(() =>
        ConfigurableDetails.of(
          {
            label: 'spring',
            nested: {
              count: 1,
            },
          },
          {
            validate: () => {
              throw new Error('Sample cannot be empty');
            },
          },
        ),
      ).toThrow('Sample cannot be empty');

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

  describe('value', () => {
    it('primitive value object의 primitive value를 반환한다', () => {
      const sampleName = SampleName.of('spring');

      expect(sampleName.unpack()).toBe('spring');
    });

    it('value key가 있는 composite props를 primitive wrapper로 취급하지 않는다', () => {
      const details = SampleValueKeyDetails.of({
        value: 'spring',
        label: 'season',
      });

      expect(details.unpack()).toEqual({
        value: 'spring',
        label: 'season',
      });
    });
  });

  describe('equals', () => {
    it('같은 값을 가진 다른 value object를 true로 비교한다', () => {
      const first = SampleName.of('spring');
      const second = SampleName.of('spring');

      expect(first.equals(second)).toBe(true);
    });

    it('다른 값을 가진 다른 value object를 false로 비교한다', () => {
      const first = SampleName.of('spring');
      const second = SampleName.of('summer');

      expect(first.equals(second)).toBe(false);
    });

    it('비교 대상이 undefined이면 false를 반환한다', () => {
      const sampleName = SampleName.of('spring');

      expect(sampleName.equals()).toBe(false);
    });

    it('비교 대상이 null이면 false를 반환한다', () => {
      const sampleName = SampleName.of('spring');

      expect(sampleName.equals(null as unknown as ValueObject<string>)).toBe(
        false,
      );
    });
  });
});
