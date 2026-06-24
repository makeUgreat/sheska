import { ok, type Result } from '@core/result';
import {
  AggregateRoot,
  DomainEvent,
  type DomainError,
  type EntityParams,
} from '@kernels/domain';
import { describe, expect, it } from 'vitest';

interface SampleProps {
  name: string;
}

class SampleDomainEvent extends DomainEvent<string, 'sample.changed'> {
  readonly eventName = 'sample.changed';
  readonly name: string;

  constructor(params: { aggregateId: string; occurredAt: Date; name: string }) {
    super(params);
    this.name = params.name;
  }
}

class SampleAggregateRoot extends AggregateRoot<
  string,
  SampleProps,
  SampleDomainEvent
> {
  static create(params: {
    id: string;
    props?: SampleProps;
  }): Result<SampleAggregateRoot, DomainError> {
    return SampleAggregateRoot.construct({
      params: {
        id: params.id,
        props: params.props ?? { name: 'spring' },
      },
      validate: (entityParams) => ok(entityParams),
    });
  }

  private constructor(params: EntityParams<string, SampleProps>) {
    super(params);
  }

  changeName(name: string): void {
    this.addDomainEvent(
      new SampleDomainEvent({
        aggregateId: this.id,
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
        name,
      }),
    );
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

  describe('domainEvents', () => {
    it('aggregate root가 기록한 domain event 목록을 반환한다', () => {
      const result = SampleAggregateRoot.create({
        id: 'sample-1',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        result.value.changeName('summer');

        expect(result.value.domainEvents).toHaveLength(1);
        expect(result.value.domainEvents[0]).toBeInstanceOf(SampleDomainEvent);
        expect(result.value.domainEvents[0]).toMatchObject({
          eventName: 'sample.changed',
          aggregateId: 'sample-1',
          occurredAt: new Date('2026-01-01T00:00:00.000Z'),
          name: 'summer',
        });
      }
    });

    it('반환한 domain event 배열 변경을 내부 목록에 반영하지 않는다', () => {
      const result = SampleAggregateRoot.create({
        id: 'sample-1',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        result.value.changeName('summer');
        const domainEvents = result.value.domainEvents as SampleDomainEvent[];

        domainEvents.push(
          new SampleDomainEvent({
            aggregateId: 'sample-1',
            occurredAt: new Date('2026-01-02T00:00:00.000Z'),
            name: 'fall',
          }),
        );

        expect(result.value.domainEvents).toHaveLength(1);
      }
    });
  });

  describe('findDomainEvent', () => {
    it('eventName으로 기록된 domain event를 찾는다', () => {
      const result = SampleAggregateRoot.create({
        id: 'sample-1',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        result.value.changeName('summer');

        const domainEvent = result.value.findDomainEvent('sample.changed');

        expect(domainEvent).toMatchObject({
          eventName: 'sample.changed',
          aggregateId: 'sample-1',
          name: 'summer',
        });
      }
    });

    it('eventName에 맞는 domain event가 없으면 undefined를 반환한다', () => {
      const result = SampleAggregateRoot.create({
        id: 'sample-1',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.findDomainEvent('sample.changed')).toBeUndefined();
      }
    });
  });

  describe('clearDomainEvents', () => {
    it('기록된 domain event를 비운다', () => {
      const result = SampleAggregateRoot.create({
        id: 'sample-1',
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        result.value.changeName('summer');

        result.value.clearDomainEvents();

        expect(result.value.domainEvents).toEqual([]);
      }
    });
  });
});
