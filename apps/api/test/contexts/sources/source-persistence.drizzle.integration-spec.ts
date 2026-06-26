import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { Source, SourceSyncJob } from '@contexts/sources/domain';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { SourceDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source.drizzle.repository';
import { SourceSyncJobDrizzleRepository } from '@contexts/sources/infrastructure/persistence/postgres-drizzle/source-sync-job.drizzle.repository';
import * as schema from '@contexts/sources/infrastructure/persistence/postgres-drizzle/schema';

const databaseUrl = process.env.SHESKA_TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase('Source Drizzle repositories', () => {
  let pool: Pool;
  let sources: SourceDrizzleRepository;
  let syncJobs: SourceSyncJobDrizzleRepository;

  beforeEach(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    const db = drizzle({ client: pool, schema });

    await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
    await pool.query('TRUNCATE TABLE source_sync_jobs, sources CASCADE');

    sources = new SourceDrizzleRepository(db);
    syncJobs = new SourceSyncJobDrizzleRepository(db);
  });

  afterEach(async () => {
    await pool.end();
  });

  it('source를 저장하고 externalSourceId로 조회한다', async () => {
    const source = createSource({
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });

    const saveResult = await sources.save(source);
    const findResult = await sources.findByExternalSourceId('Notes/source.md');

    expect(saveResult.isOk()).toBe(true);
    expect(findResult.isOk()).toBe(true);

    if (findResult.isOk()) {
      expect(findResult.value?.id).toBe(source.id);
      expect(findResult.value?.getProps().contentSnapshot.value).toEqual({
        content: '# Source note',
        fingerprint: 'fingerprint-1',
        size: byteSize('# Source note'),
      });
    }
  });

  it('source를 갱신하고 sync job을 저장한다', async () => {
    const source = createSource({
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
    await sources.save(source);

    source
      .syncContentSnapshot({
        content: '# Changed source note',
        fingerprint: 'fingerprint-2',
        size: byteSize('# Changed source note'),
      })
      ._unsafeUnwrap();

    const saveSourceResult = await sources.save(source);
    const syncJob = SourceSyncJob.create({
      sourceId: source.id,
      fingerprint: 'fingerprint-2',
    })._unsafeUnwrap();
    const saveSyncJobResult = await syncJobs.save(syncJob);
    const findResult = await sources.findByExternalSourceId('Notes/source.md');

    expect(saveSourceResult.isOk()).toBe(true);
    expect(saveSyncJobResult.isOk()).toBe(true);

    if (saveSyncJobResult.isOk()) {
      expect(saveSyncJobResult.value.id).toBe(syncJob.id);
      expect(saveSyncJobResult.value.getProps()).toMatchObject({
        sourceId: source.id,
        status: 'pending',
      });
      expect(saveSyncJobResult.value.getProps().fingerprint.value).toBe(
        'fingerprint-2',
      );
    }

    if (findResult.isOk()) {
      expect(findResult.value?.getProps().contentSnapshot.value).toEqual({
        content: '# Changed source note',
        fingerprint: 'fingerprint-2',
        size: byteSize('# Changed source note'),
      });
    }
  });

  it('externalSourceId unique 충돌을 state conflict로 매핑한다', async () => {
    const firstSource = createSource({
      content: '# Source note',
      fingerprint: 'fingerprint-1',
    });
    const secondSource = createSource({
      content: '# Another source note',
      fingerprint: 'fingerprint-2',
    });

    await sources.save(firstSource);

    const result = await sources.save(secondSource);

    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error.kind).toBe('state_conflict');
      expect(result.error.code).toBe('source_repository.state_conflict');
    }
  });
});

function createSource(params: {
  content: string;
  fingerprint: string;
}): Source {
  return Source.create({
    externalSourceId: 'Notes/source.md',
    content: params.content,
    fingerprint: params.fingerprint,
    size: byteSize(params.content),
  })._unsafeUnwrap();
}

function byteSize(content: string): number {
  return new TextEncoder().encode(content).length;
}
