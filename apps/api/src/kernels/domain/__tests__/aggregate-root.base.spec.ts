import {
  AggregateRoot,
  DomainEvent,
  type CreateEntityProps,
} from '@kernels/domain';
import { describe, expect, it } from 'vitest';

interface SampleProps {
  name: string;
}

class SampleDomainEvent extends DomainEvent<'sample.changed'> {
  readonly eventName = 'sample.changed';
  readonly name: string;

  constructor(params: { aggregateId: string; occurredAt: Date; name: string }) {
    super(params);
    this.name = params.name;
  }
}

class SampleAggregateRoot extends AggregateRoot<
  SampleProps,
  SampleDomainEvent
> {
  static create(params: {
    id: string;
    props?: SampleProps;
  }): SampleAggregateRoot {
    return new SampleAggregateRoot({
      id: params.id,
      props: params.props ?? { name: 'spring' },
    });
  }

  constructor(params: CreateEntityProps<SampleProps>) {
    super(params);
  }

  public validate(): void {}

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
  describe('constructor', () => {
    it('AggregateRoot instance를 반환한다', () => {
      const aggregate = SampleAggregateRoot.create({
        id: 'sample-1',
      });

      expect(aggregate).toBeInstanceOf(AggregateRoot);
    });
  });

  describe('domainEvents', () => {
    it('aggregate root가 기록한 domain event 목록을 반환한다', () => {
      const aggregate = SampleAggregateRoot.create({
        id: 'sample-1',
      });

      aggregate.changeName('summer');

      expect(aggregate.domainEvents).toHaveLength(1);
      expect(aggregate.domainEvents[0]).toBeInstanceOf(SampleDomainEvent);
      expect(aggregate.domainEvents[0]).toMatchObject({
        eventName: 'sample.changed',
        aggregateId: 'sample-1',
        occurredAt: new Date('2026-01-01T00:00:00.000Z'),
        name: 'summer',
      });
    });

    it('반환한 domain event 배열 변경을 내부 목록에 반영하지 않는다', () => {
      const aggregate = SampleAggregateRoot.create({
        id: 'sample-1',
      });

      aggregate.changeName('summer');
      const domainEvents = aggregate.domainEvents as SampleDomainEvent[];

      domainEvents.push(
        new SampleDomainEvent({
          aggregateId: 'sample-1',
          occurredAt: new Date('2026-01-02T00:00:00.000Z'),
          name: 'fall',
        }),
      );

      expect(aggregate.domainEvents).toHaveLength(1);
    });
  });

  describe('findDomainEvent', () => {
    it('eventName으로 기록된 domain event를 찾는다', () => {
      const aggregate = SampleAggregateRoot.create({
        id: 'sample-1',
      });

      aggregate.changeName('summer');

      const domainEvent = aggregate.findDomainEvent('sample.changed');

      expect(domainEvent).toMatchObject({
        eventName: 'sample.changed',
        aggregateId: 'sample-1',
        name: 'summer',
      });
    });

    it('eventName에 맞는 domain event가 없으면 undefined를 반환한다', () => {
      const aggregate = SampleAggregateRoot.create({
        id: 'sample-1',
      });

      expect(aggregate.findDomainEvent('sample.changed')).toBeUndefined();
    });
  });

  describe('clearDomainEvents', () => {
    it('기록된 domain event를 비운다', () => {
      const aggregate = SampleAggregateRoot.create({
        id: 'sample-1',
      });

      aggregate.changeName('summer');

      aggregate.clearDomainEvents();

      expect(aggregate.domainEvents).toEqual([]);
    });
  });
});
