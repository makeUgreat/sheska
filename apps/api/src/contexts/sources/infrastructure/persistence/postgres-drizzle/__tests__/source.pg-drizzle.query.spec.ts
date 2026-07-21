import { describe, expect, it, vi } from 'vitest';
import { SourcePgDrizzleQuery } from '../source.pg-drizzle.query';

function createFailingDb() {
  return {
    execute: vi.fn().mockRejectedValue(new Error('DB connection lost')),
  };
}

describe('SourcePgDrizzleQuery', () => {
  it('paginate DB 오류를 InfrastructureException으로 래핑한다', async () => {
    const db = createFailingDb();
    const query = new SourcePgDrizzleQuery(db as never);

    await expect(query.paginate()).rejects.toMatchObject({
      code: 'source.paginate_failed',
      source: { boundary: 'persistence', adapter: 'source.pg-drizzle' },
    });
  });

  it('find DB 오류를 InfrastructureException으로 래핑한다', async () => {
    const db = createFailingDb();
    const query = new SourcePgDrizzleQuery(db as never);

    await expect(query.find({ sourceId: 'source-1' })).rejects.toMatchObject({
      code: 'source.find_published_post_failed',
      source: { boundary: 'persistence', adapter: 'source.pg-drizzle' },
    });
  });
});
