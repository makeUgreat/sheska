import { describe, expect, it, vi } from 'vitest';
import { PostPgDrizzleQuery } from '../post.pg-drizzle.query';

function createFailingDb() {
  const chainable = {
    limit: vi.fn(),
  };
  chainable.limit.mockRejectedValue(new Error('DB connection lost'));

  return {
    execute: vi.fn().mockRejectedValue(new Error('DB connection lost')),
  };
}

describe('PostPgDrizzleQuery', () => {
  it('getById DB 오류를 InfrastructureException으로 래핑한다', async () => {
    const db = createFailingDb();
    const query = new PostPgDrizzleQuery(db as never);

    await expect(query.find({ id: 'post-1' })).rejects.toMatchObject({
      code: 'post.get_with_source_failed',
      source: { boundary: 'persistence', adapter: 'post.pg-drizzle' },
    });
  });
});
