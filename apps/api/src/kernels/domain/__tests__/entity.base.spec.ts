import { Entity, type CreateEntityProps } from '@kernels/domain';
import { describe, expect, it } from 'vitest';

interface SampleProps {
  name: string;
}

class SampleEntity extends Entity<SampleProps> {
  constructor(params: CreateEntityProps<SampleProps>) {
    super(params);
  }

  public validate(): void {}
}

class ValidatedEntity extends Entity<SampleProps> {
  constructor(params: CreateEntityProps<SampleProps>) {
    super(params);
  }

  public validate(): void {
    if (this.props.name.trim().length === 0) {
      throw new Error('Sample name cannot be empty');
    }
  }
}

describe('Entity', () => {
  describe('constructor', () => {
    it('문자열 entity identifier를 그대로 보존한다', () => {
      const entity = new SampleEntity({
        id: '  sample-1  ',
        props: { name: 'spring' },
      });

      expect(entity.id).toBe('  sample-1  ');
      expect(entity.getProps().name).toBe('spring');
    });

    it.each<[string, unknown]>([
      ['string', 'invalid'],
      ['null', null],
      ['array', []],
      ['Date instance', new Date('2026-01-01T00:00:00.000Z')],
    ])('props가 %s이면 throw한다', (_caseName, props) => {
      expect(
        () =>
          new SampleEntity({
            id: 'sample-1',
            props: props as SampleProps,
          }),
      ).toThrow('Entity props must be an object');
    });

    it('빈 props이면 throw한다', () => {
      expect(
        () =>
          new SampleEntity({
            id: 'sample-1',
            props: {} as SampleProps,
          }),
      ).toThrow('Entity props should not be empty');
    });

    it('props가 너무 많으면 throw한다', () => {
      const props = Object.fromEntries(
        Array.from({ length: 51 }, (_, index) => [`prop${index}`, index]),
      ) as unknown as SampleProps;

      expect(
        () =>
          new SampleEntity({
            id: 'sample-1',
            props,
          }),
      ).toThrow('Entity props should not have more than 50 properties');
    });

    it('subclass validate가 실패하면 throw한다', () => {
      expect(
        () =>
          new ValidatedEntity({
            id: 'sample-1',
            props: { name: ' ' },
          }),
      ).toThrow('Sample name cannot be empty');
    });
  });

  describe('getProps', () => {
    it('id와 entity props를 함께 반환한다', () => {
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      const updatedAt = new Date('2026-01-02T00:00:00.000Z');
      const entity = new SampleEntity({
        id: 'sample-1',
        props: { name: 'spring' },
        createdAt,
        updatedAt,
      });

      expect(entity.getProps()).toEqual({
        id: 'sample-1',
        name: 'spring',
        createdAt,
        updatedAt,
      });
    });

    it('props에 id field가 있어도 entity ID를 유지한다', () => {
      const entity = new SampleEntity({
        id: 'entity-id',
        props: {
          id: 'props-id',
          name: 'spring',
        } as unknown as SampleProps,
      });

      expect(entity.getProps().id).toBe('entity-id');
    });

    it('재할당할 수 없는 props를 반환한다', () => {
      const entity = new SampleEntity({
        id: 'sample-1',
        props: { name: 'spring' },
      });

      expect(() => {
        Object.assign(entity.getProps(), { name: 'summer' });
      }).toThrow(TypeError);
    });
  });
});
