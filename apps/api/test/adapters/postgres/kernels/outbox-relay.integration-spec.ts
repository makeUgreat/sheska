import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq, sql } from 'drizzle-orm';
import {
  DATABASE_TOKENS,
  outboxMessages,
  PgDrizzleOutboxStore,
} from '@kernels/infrastructure';
import { type ApiDrizzleDatabase } from '@platform/nest/database/drizzle-postgres.provider';
import { AppModule } from '@platform/nest/app.module';

const LEASE_MS = 30_000;

describe('PgDrizzleOutboxStore claim', () => {
  let app: INestApplication;
  let database: ApiDrizzleDatabase;
  let store: PgDrizzleOutboxStore;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    database = app.get(DATABASE_TOKENS.drizzleDatabase);
    store = new PgDrizzleOutboxStore(database);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await database.delete(outboxMessages);
  });

  it('claim한 row의 시도 횟수를 올리고 다음 시도 시각을 lease만큼 미룬다', async () => {
    await insertPendingMessage('event-claim-1');

    const claimed = await store.claimDue(10, LEASE_MS);

    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.event.eventId).toBe('event-claim-1');
    expect(claimed[0]?.attemptCount).toBe(1);

    const row = await findRow('event-claim-1');
    expect(row?.attemptCount).toBe(1);
    expect(row?.nextAttemptAt.getTime()).toBeGreaterThan(
      Date.now() + LEASE_MS / 2,
    );
  });

  it('다음 시도 시각이 아직 오지 않은 row는 claim하지 않는다', async () => {
    await insertPendingMessage('event-future', {
      nextAttemptAt: sql`now() + interval '1 hour'`,
    });

    const claimed = await store.claimDue(10, LEASE_MS);

    expect(claimedEventIds(claimed)).not.toContain('event-future');
  });

  it('생성 시각이 같은 row도 eventId 순서로 claim한다', async () => {
    const createdAt = sql`'2026-09-18T00:00:00.000Z'::timestamptz`;
    await insertPendingMessage('event-order-b', { createdAt });
    await insertPendingMessage('event-order-a', { createdAt });

    const claimed = await store.claimDue(10, LEASE_MS);

    expect(claimedEventIds(claimed)).toEqual([
      'event-order-a',
      'event-order-b',
    ]);
  });

  it('재시도를 예약하면 다음 시도 시각과 실패 사유를 기록한다', async () => {
    await insertPendingMessage('event-retry');
    await store.claimDue(10, LEASE_MS);

    await store.scheduleRetry('event-retry', 2_000, 'Dispatcher unavailable');

    const row = await findRow('event-retry');
    expect(row?.lastFailureReason).toBe('Dispatcher unavailable');
    expect(row?.nextAttemptAt.getTime()).toBeLessThan(
      Date.now() + LEASE_MS / 2,
    );
    expect(row?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('격리된 row는 claim하지 않는다', async () => {
    await insertPendingMessage('event-dead-lettered');
    await store.markDeadLettered('event-dead-lettered', 'Dispatcher down');

    const claimed = await store.claimDue(10, LEASE_MS);

    expect(claimedEventIds(claimed)).not.toContain('event-dead-lettered');
  });

  it('발행 완료된 row는 claim하지 않는다', async () => {
    await insertPendingMessage('event-published');
    await store.markPublished('event-published');

    const claimed = await store.claimDue(10, LEASE_MS);

    expect(claimedEventIds(claimed)).not.toContain('event-published');
  });

  it('동시에 claim해도 같은 row를 두 번 내주지 않는다', async () => {
    await insertPendingMessage('event-contended');

    await database.transaction(async (tx) => {
      const holdingStore = new PgDrizzleOutboxStore(tx);
      const held = await holdingStore.claimDue(10, LEASE_MS);
      expect(claimedEventIds(held)).toContain('event-contended');

      const concurrent = await store.claimDue(10, LEASE_MS);

      expect(claimedEventIds(concurrent)).not.toContain('event-contended');
    });
  });

  async function insertPendingMessage(
    eventId: string,
    overrides: {
      nextAttemptAt?: ReturnType<typeof sql>;
      createdAt?: ReturnType<typeof sql>;
    } = {},
  ): Promise<void> {
    await database.insert(outboxMessages).values({
      eventId,
      eventType: 'source.sync_job.created',
      eventVersion: 1,
      payload: { sourceId: 'source-1', syncJobId: 'sync-job-1' },
      occurredAt: new Date('2026-09-18T00:00:00.000Z'),
      ...(overrides.nextAttemptAt
        ? { nextAttemptAt: overrides.nextAttemptAt }
        : {}),
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    });
  }

  async function findRow(eventId: string) {
    const [row] = await database
      .select()
      .from(outboxMessages)
      .where(eq(outboxMessages.eventId, eventId));
    return row;
  }
});

function claimedEventIds(
  claimed: Awaited<ReturnType<PgDrizzleOutboxStore['claimDue']>>,
): string[] {
  return claimed.map(({ event }) => event.eventId);
}
