import { describe, expect, it, vi } from 'vitest';
import { type IntegrationEvent } from '@kernels/application';
import { type PgDrizzleSession } from '../../../pg-drizzle.session';
import { type OutboxMessageRow } from '../outbox.pg-drizzle.schema';
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

  it('claim한 row를 event와 시도 횟수로 매핑하고 생성 순서로 정렬한다', async () => {
    const earlier = buildClaimedRow({
      eventId: 'event-earlier',
      createdAt: new Date('2026-09-18T00:00:00.000Z'),
      attemptCount: 2,
    });
    const later = buildClaimedRow({
      eventId: 'event-later',
      createdAt: new Date('2026-09-18T00:00:01.000Z'),
      attemptCount: 1,
    });
    const store = new PgDrizzleOutboxStore(
      claimDatabase(vi.fn().mockResolvedValue([later, earlier])),
    );

    const result = await store.claimDue(50, 30_000);

    expect(result.map(({ event }) => event.eventId)).toEqual([
      'event-earlier',
      'event-later',
    ]);
    expect(result[0]).toEqual({
      event: {
        eventId: 'event-earlier',
        eventType: earlier.eventType,
        eventVersion: earlier.eventVersion,
        occurredAt: earlier.occurredAt,
        payload: earlier.payload,
      },
      attemptCount: 2,
    });
  });

  it('생성 시각이 같으면 eventId로 정렬한다', async () => {
    const createdAt = new Date('2026-09-18T00:00:00.000Z');
    const store = new PgDrizzleOutboxStore(
      claimDatabase(
        vi
          .fn()
          .mockResolvedValue([
            buildClaimedRow({ eventId: 'event-b', createdAt }),
            buildClaimedRow({ eventId: 'event-a', createdAt }),
          ]),
      ),
    );

    const result = await store.claimDue(50, 30_000);

    expect(result.map(({ event }) => event.eventId)).toEqual([
      'event-a',
      'event-b',
    ]);
  });

  it('claim 실패를 infrastructure exception으로 감싼다', async () => {
    const failure = new Error('connection terminated');
    const store = new PgDrizzleOutboxStore(
      claimDatabase(vi.fn().mockRejectedValue(failure)),
    );

    await expect(store.claimDue(50, 30_000)).rejects.toMatchObject({
      code: 'outbox.claim_due_failed',
      source: { boundary: 'persistence', adapter: 'outbox.pg-drizzle' },
      cause: failure,
    });
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

  it('재시도 예약은 nextAttemptAt과 lastFailureReason을 함께 기록한다', async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn((_values: object) => ({ where }));
    const database = asDatabase({
      update: vi.fn(() => ({ set })),
    });
    const store = new PgDrizzleOutboxStore(database);

    await store.scheduleRetry('event-1', 2_000, 'Dispatcher unavailable');

    expect(set.mock.calls[0]?.[0]).toHaveProperty('nextAttemptAt');
    expect(set.mock.calls[0]?.[0]).toMatchObject({
      lastFailureReason: 'Dispatcher unavailable',
    });
  });

  it('격리는 deadLetteredAt과 lastFailureReason을 함께 기록한다', async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn((_values: object) => ({ where }));
    const database = asDatabase({
      update: vi.fn(() => ({ set })),
    });
    const store = new PgDrizzleOutboxStore(database);

    await store.markDeadLettered('event-1', 'Dispatcher unavailable');

    expect(set.mock.calls[0]?.[0]).toHaveProperty('deadLetteredAt');
    expect(set.mock.calls[0]?.[0]).toMatchObject({
      lastFailureReason: 'Dispatcher unavailable',
    });
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

function buildClaimedRow(
  overrides: Partial<OutboxMessageRow> = {},
): OutboxMessageRow {
  return {
    eventId: 'event-1',
    eventType: 'source.sync_job.created',
    eventVersion: 1,
    occurredAt: new Date('2026-09-10T00:00:00.000Z'),
    payload: { sourceId: 'source-1' },
    createdAt: new Date('2026-09-10T00:01:00.000Z'),
    publishedAt: null,
    attemptCount: 1,
    nextAttemptAt: new Date('2026-09-10T00:01:30.000Z'),
    deadLetteredAt: null,
    lastFailureReason: null,
    ...overrides,
  };
}

function claimDatabase(
  returning: ReturnType<typeof vi.fn>,
): PgDrizzleSession<typeof outboxSchema> {
  return asDatabase({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({ for: vi.fn(() => 'due-event-ids') })),
          })),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(() => ({ returning })) })),
    })),
  });
}

function asDatabase(value: object): PgDrizzleSession<typeof outboxSchema> {
  return value as PgDrizzleSession<typeof outboxSchema>;
}
