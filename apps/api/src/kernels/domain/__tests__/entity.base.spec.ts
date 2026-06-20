import { err, ok, type Result } from '@core/result';
import { Entity, type DomainError, type EntityParams } from '@kernels/domain';
import { describe, expect, it, vi } from 'vitest';

interface SampleProps {
  name: string;
}

const sampleValidationError: DomainError = {
  kind: 'invariant_violation',
  code: 'sample.invalid',
  message: 'Sample is invalid',
  details: { fields: ['name'] },
};

class SampleEntity extends Entity<string, SampleProps> {
  static create(params: {
    id: string;
    props?: SampleProps;
  }): Result<SampleEntity, DomainError> {
    return SampleEntity.restore({
      id: params.id,
      props: params.props ?? { name: 'spring' },
    });
  }

  static restore(
    params: EntityParams<string, SampleProps>,
  ): Result<SampleEntity, DomainError> {
    return super.construct({
      params,
      validate: (entityParams) => ok(entityParams),
      instantiate: (entityParams) => new SampleEntity(entityParams),
    });
  }

  private constructor(params: EntityParams<string, SampleProps>) {
    super(params);
  }
}

class NumericIdEntity extends Entity<number, SampleProps> {
  static create(params: {
    id: number;
    props?: SampleProps;
  }): Result<NumericIdEntity, DomainError> {
    return super.construct({
      params: {
        id: params.id,
        props: params.props ?? { name: 'spring' },
      },
      validate: (entityParams) => ok(entityParams),
      instantiate: (entityParams) => new NumericIdEntity(entityParams),
    });
  }

  private constructor(params: EntityParams<number, SampleProps>) {
    super(params);
  }
}

type SampleEntityParams = EntityParams<string, SampleProps>;
type SampleEntityValidator = (
  params: SampleEntityParams,
) => Result<SampleEntityParams, DomainError>;
type SampleEntityFactory = (params: SampleEntityParams) => ConfigurableEntity;

class ConfigurableEntity extends Entity<string, SampleProps> {
  static restore(
    params: SampleEntityParams,
    options?: {
      validate?: SampleEntityValidator;
      instantiate?: SampleEntityFactory;
    },
  ): Result<ConfigurableEntity, DomainError> {
    return super.construct({
      params,
      validate: options?.validate ?? ((entityParams) => ok(entityParams)),
      instantiate:
        options?.instantiate ??
        ((entityParams) => new ConfigurableEntity(entityParams)),
    });
  }

  constructor(params: SampleEntityParams) {
    super(params);
  }
}

describe('Entity', () => {
  describe('construct', () => {
    it('validation을 통과하면 entity를 담은 성공 Result를 반환한다', () => {
      const result = SampleEntity.create({
        id: 'sample-1',
        props: { name: 'spring' },
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.id).toBe('sample-1');
        expect(result.value.getProps().name).toBe('spring');
      }
    });

    it('숫자형 entity identifier를 지원한다', () => {
      const result = NumericIdEntity.create({
        id: 1,
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.id).toBe(1);
        expect(result.value.getProps().id).toBe(1);
      }
    });

    it('base entity 수준에서 빈 props를 허용한다', () => {
      const result = SampleEntity.restore({
        id: 'sample-1',
        props: {} as SampleProps,
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.getProps()).toEqual({
          id: 'sample-1',
        });
      }
    });

    it.each<[string, unknown]>([
      ['string', 'invalid'],
      ['null', null],
      ['array', []],
      ['Date instance', new Date('2026-01-01T00:00:00.000Z')],
    ])('props가 %s이면 실패 Result를 반환한다', (_caseName, props) => {
      const result = SampleEntity.restore({
        id: 'sample-1',
        props: props as SampleProps,
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('entity.props_not_object');
      }
    });

    it('base entity 수준에서 많은 props를 허용한다', () => {
      const props = Object.fromEntries(
        Array.from({ length: 51 }, (_, index) => [`prop${index}`, index]),
      ) as unknown as SampleProps;
      const result = SampleEntity.restore({
        id: 'sample-1',
        props,
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(Object.keys(result.value.getProps()).length).toBe(52);
      }
    });

    it('props에 id field가 있어도 entity ID를 유지한다', () => {
      const result = SampleEntity.restore({
        id: 'entity-id',
        props: {
          id: 'props-id',
          name: 'spring',
        } as unknown as SampleProps,
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.getProps().id).toBe('entity-id');
      }
    });

    it('custom validation이 실패하면 실패 Result를 반환한다', () => {
      const result = ConfigurableEntity.restore(
        {
          id: 'sample-1',
          props: { name: 'spring' },
        },
        {
          validate: () => err(sampleValidationError),
        },
      );

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error).toBe(sampleValidationError);
      }
    });

    it('base validation이 실패하면 custom validation을 호출하지 않는다', () => {
      const validate = vi.fn((params: SampleEntityParams) => ok(params));

      ConfigurableEntity.restore(
        {
          id: 'sample-1',
          props: null as unknown as SampleProps,
        },
        { validate },
      );

      expect(validate).not.toHaveBeenCalled();
    });

    it('custom validation이 실패하면 instantiate를 호출하지 않는다', () => {
      const instantiate = vi.fn((params: SampleEntityParams) => {
        return new ConfigurableEntity(params);
      });

      ConfigurableEntity.restore(
        {
          id: 'sample-1',
          props: { name: 'spring' },
        },
        {
          validate: () => err(sampleValidationError),
          instantiate,
        },
      );

      expect(instantiate).not.toHaveBeenCalled();
    });
  });

  describe('getProps', () => {
    it('id와 entity props를 함께 반환한다', () => {
      const result = SampleEntity.create({
        id: 'sample-1',
        props: { name: 'spring' },
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.getProps()).toEqual({
          id: 'sample-1',
          name: 'spring',
        });
      }
    });

    it('재할당할 수 없는 props를 반환한다', () => {
      const result = SampleEntity.create({
        id: 'sample-1',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(() => {
          Object.assign(result.value.getProps(), { name: 'summer' });
        }).toThrow(TypeError);
      }
    });
  });
});
