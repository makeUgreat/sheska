import { ok, type Result } from '@core/result';
import {
  AggregateRoot,
  type DomainError,
  type EntityParams,
} from '@kernels/domain';
import { describe, expect, it } from 'vitest';

interface SampleProps {
  name: string;
}

class SampleAggregateRoot extends AggregateRoot<string, SampleProps> {
  static create(params: {
    id: string;
    props?: SampleProps;
  }): Result<SampleAggregateRoot, DomainError> {
    return super.construct({
      params: {
        id: params.id,
        props: params.props ?? { name: 'spring' },
      },
      validate: (entityParams) => ok(entityParams),
      instantiate: (entityParams) => new SampleAggregateRoot(entityParams),
    });
  }

  private constructor(params: EntityParams<string, SampleProps>) {
    super(params);
  }
}

describe('AggregateRoot', () => {
  describe('construct', () => {
    it('AggregateRoot instance를 반환한다', () => {
      const result = SampleAggregateRoot.create({
        id: 'sample-1',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value).toBeInstanceOf(AggregateRoot);
      }
    });
  });
});
