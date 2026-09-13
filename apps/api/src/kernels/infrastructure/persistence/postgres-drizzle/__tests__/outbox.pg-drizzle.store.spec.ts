import { describe, expect, it, vi } from 'vitest';
import { type IntegrationEvent } from '@kernels/application';
import { type PgDrizzleSession } from '../../../pg-drizzle.session';
import * as outboxSchema from '../outbox.pg-drizzle.schema';
import { PgDrizzleOutboxStore } from '../outbox.pg-drizzle.store';

describe('PgDrizzleOutboxStore', () => {
  it('integration event를 outbox row로 저장한다', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const database = asDatabase({
      insert: vi.fn(() => ({ values })),
    });
    const store = new PgDrizzleOutboxStore(database);
    const event = buildIntegrationEvent();

    await store.append(event);

    expect(values).toHaveBeenCalledWith({
      eventId: event.eventId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      payload: event.payload,
      occurredAt: event.occurredAt,
    });
  });

  it('미발행 row를 생성 순서로 제한해 조회하고 event로 매핑한다', async () => {
    const event = buildIntegrationEvent();
    const limit = vi.fn().mockResolvedValue([
      {
        ...event,
        createdAt: new Date('2026-09-10T00:01:00.000Z'),
        publishedAt: null,
      },
    ]);
    const database = asDatabase({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({ limit })),
          })),
        })),
      })),
    });
    const store = new PgDrizzleOutboxStore(database);

    const result = await store.findPending(50);

    expect(limit).toHaveBeenCalledWith(50);
    expect(result).toEqual([event]);
  });

  it('아직 미발행인 event에만 publishedAt을 기록한다', async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn((_values: object) => ({ where }));
    const database = asDatabase({
      update: vi.fn(() => ({ set })),
    });
    const store = new PgDrizzleOutboxStore(database);

    await store.markPublished('event-1');

    expect(set).toHaveBeenCalledOnce();
    expect(set.mock.calls[0]?.[0]).toHaveProperty('publishedAt');
    expect(where).toHaveBeenCalledOnce();
  });
});

function buildIntegrationEvent(): IntegrationEvent {
  return {
    eventId: 'event-1',
    eventType: 'source.sync_job.created',
    eventVersion: 1,
    occurredAt: new Date('2026-09-10T00:00:00.000Z'),
    payload: {
      sourceId: 'source-1',
      syncJobId: 'sync-job-1',
      content: '# Source note',
    },
  };
}

function asDatabase(value: object): PgDrizzleSession<typeof outboxSchema> {
  return value as PgDrizzleSession<typeof outboxSchema>;
}
