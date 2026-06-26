import { describe, expect, it } from 'vitest';
import { parseDatabaseConfig } from '../database.config';

const validDatabaseUrl = 'postgres://sheska:sheska@localhost:5432/sheska';

describe('database config', () => {
  it('DATABASE_URL이 유효하면 typed config를 반환한다', () => {
    const config = parseDatabaseConfig({
      DATABASE_URL: validDatabaseUrl,
    });

    expect(config).toEqual({
      databaseUrl: validDatabaseUrl,
    });
  });

  it('DATABASE_URL이 없으면 validation에 실패한다', () => {
    expect(() => parseDatabaseConfig({})).toThrow();
  });

  it('DATABASE_URL이 빈 문자열이면 validation에 실패한다', () => {
    expect(() =>
      parseDatabaseConfig({
        DATABASE_URL: '',
      }),
    ).toThrow();
  });

  it('DATABASE_URL이 URL 형식이 아니면 validation에 실패한다', () => {
    expect(() =>
      parseDatabaseConfig({
        DATABASE_URL: 'not-a-url',
      }),
    ).toThrow();
  });
});
