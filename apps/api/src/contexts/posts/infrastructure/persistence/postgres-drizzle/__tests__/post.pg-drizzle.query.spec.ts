import { describe, expect, it, vi } from 'vitest';
import { PostPgDrizzleQuery } from '../post.pg-drizzle.query';

function createFailingDb() {
  return {
    execute: vi.fn().mockRejectedValue(new Error('DB connection lost')),
  };
}

function createFailingSelectDb() {
  const limit = vi.fn().mockRejectedValue(new Error('DB connection lost'));
  const where = vi.fn().mockReturnValue({ limit });
  const orderBy = vi.fn().mockReturnValue({ limit, where });
  const from = vi.fn().mockReturnValue({ orderBy, where });
  const select = vi.fn().mockReturnValue({ from });

  return { execute: vi.fn(), select };
}

describe('PostPgDrizzleQuery', () => {
  it('find DB 오류를 InfrastructureException으로 래핑한다', async () => {
    const db = createFailingDb();
    const query = new PostPgDrizzleQuery(db as never);

    await expect(query.find({ id: 'post-1' })).rejects.toMatchObject({
      code: 'post.get_with_source_failed',
      source: { boundary: 'persistence', adapter: 'post.pg-drizzle' },
    });
  });

  it('paginate DB 오류를 InfrastructureException으로 래핑한다', async () => {
    const db = createFailingSelectDb();
    const query = new PostPgDrizzleQuery(db as never);

    await expect(query.paginate()).rejects.toMatchObject({
      code: 'post.paginate_failed',
      source: { boundary: 'persistence', adapter: 'post.pg-drizzle' },
    });
  });

  it('search DB 오류를 InfrastructureException으로 래핑한다', async () => {
    const db = createFailingSelectDb();
    const query = new PostPgDrizzleQuery(db as never);

    await expect(query.search({ query: 'TypeScript' })).rejects.toMatchObject({
      code: 'post.search_failed',
      source: { boundary: 'persistence', adapter: 'post.pg-drizzle' },
    });
  });
});
