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
  it('find DB 오류를 UnexpectedError로 래핑한다', async () => {
    const db = createFailingDb();
    const query = new PostPgDrizzleQuery(db as never);

    await expect(query.find({ id: 'post-1' })).rejects.toMatchObject({
      code: 'post.get_with_source_failed',
    });
  });

  it('paginate DB 오류를 UnexpectedError로 래핑한다', async () => {
    const db = createFailingSelectDb();
    const query = new PostPgDrizzleQuery(db as never);

    await expect(
      query.paginate({ limit: 20, cursor: null }),
    ).rejects.toMatchObject({
      code: 'post.paginate_failed',
    });
  });

  it('search DB 오류를 UnexpectedError로 래핑한다', async () => {
    const db = createFailingSelectDb();
    const query = new PostPgDrizzleQuery(db as never);

    await expect(
      query.search({
        query: 'TypeScript',
        limit: 20,
        cursor: null,
        queryEmbedding: null,
      }),
    ).rejects.toMatchObject({
      code: 'post.search_failed',
    });
  });

  it('count DB 오류를 UnexpectedError로 래핑한다', async () => {
    const db = createFailingDb();
    const query = new PostPgDrizzleQuery(db as never);

    await expect(query.count()).rejects.toMatchObject({
      code: 'post.count_failed',
    });
  });
});
