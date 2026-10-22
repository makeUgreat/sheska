import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { databaseConfig } from '../database.config';

const validDatabaseUrl = 'postgres://sheska:sheska@localhost:5432/sheska';

describe('databaseConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('DATABASE_URL이 유효하면 DB 설정을 돌려준다', () => {
    vi.stubEnv('DATABASE_URL', validDatabaseUrl);

    expect(databaseConfig()).toEqual({ databaseUrl: validDatabaseUrl });
  });

  it.each([undefined, '', 'not-a-url'])(
    'DATABASE_URL이 %j이면 거부한다',
    (value) => {
      vi.stubEnv('DATABASE_URL', value);

      expect(() => databaseConfig()).toThrow('DATABASE_URL');
    },
  );

  it('DATABASE_URL_FILE이 가리키는 파일에서 DATABASE_URL을 읽는다', () => {
    const directory = mkdtempSync(join(tmpdir(), 'sheska-database-'));
    const path = join(directory, 'database-url');
    writeFileSync(path, `${validDatabaseUrl}\n`);
    vi.stubEnv('DATABASE_URL', undefined);
    vi.stubEnv('DATABASE_URL_FILE', path);

    try {
      expect(databaseConfig().databaseUrl).toBe(validDatabaseUrl);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
