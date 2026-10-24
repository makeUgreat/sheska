import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq, sql } from 'drizzle-orm';
import { sha256Hex } from '@core/hash';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { sources } from '@contexts/library/infrastructure/persistence/postgres-drizzle/schema';
import { type ApiDrizzleDatabase } from '@platform/nest/database/drizzle-postgres.provider';
import { AppModule } from '@platform/nest/app.module';
import { buildSourceRow } from './fixtures/source-row.fixture';

const MIGRATION = join(
  __dirname,
  '../../../../database/drizzle/20261024020000_fingerprint_source_body/migration.sql',
);

describe('20261024020000_fingerprint_source_body', () => {
  let app: INestApplication;
  let database: ApiDrizzleDatabase;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    database = app.get(DATABASE_TOKENS.drizzleDatabase);
  });

  afterAll(async () => {
    await app.close();
  });

  it('library.sync-6: 파일 전체로 만든 fingerprint를 앱과 같은 본문 fingerprint로 바꾼다', async () => {
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

    const [migrated] = await database
      .select({ fingerprint: sources.fingerprint })
      .from(sources)
      .where(eq(sources.id, row.id));
    expect(migrated?.fingerprint).toBe(sha256Hex(body));
  });
});
