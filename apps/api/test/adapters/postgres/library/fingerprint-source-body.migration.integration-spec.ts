import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type TestingModule } from '@nestjs/testing';
import { eq, sql } from 'drizzle-orm';
import { sha256Hex } from '@core/hash';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { sources } from '@contexts/library/infrastructure/persistence/postgres-drizzle/schema';
import { type ApiDrizzleDatabase } from '@platform/nest/database/drizzle-postgres.provider';
import { buildSourceRow } from './fixtures/source-row.fixture';
import { setupPostgresTestingModule } from '../support/setup-postgres-testing-module';

const MIGRATION = join(__dirname, '../../../../database/drizzle/20261024020000_fingerprint_source_body/migration.sql');

describe('20261024020000_fingerprint_source_body', () => {
  let testingModule: TestingModule;
  let database: ApiDrizzleDatabase;

  beforeAll(async () => {
    testingModule = await setupPostgresTestingModule([]);
    database = testingModule.get(DATABASE_TOKENS.drizzleDatabase);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  // nocap: library-sync-6
  it('파일 전체로 만든 fingerprint를 앱과 같은 본문 fingerprint로 바꾼다', async () => {
    const body = '# 안녕 👋\n\n본문만 해시한다.\n';
    const {
      titleSearchVector: _titleSearchVector,
      bodySearchVector: _bodySearchVector,
      ...row
    } = buildSourceRow({
      id: 'source-fingerprint-migration',
      externalSourceId: 'Notes/fingerprint-migration.md',
      body,
      fingerprint: 'whole-file-fingerprint',
    });
    await database.insert(sources).values(row);

    await database.execute(sql.raw(await readFile(MIGRATION, 'utf8')));

    const [migrated] = await database.select({ fingerprint: sources.fingerprint }).from(sources).where(eq(sources.id, row.id));
    expect(migrated?.fingerprint).toBe(sha256Hex(body));
  });
});
