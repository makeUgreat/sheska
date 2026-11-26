import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type PostRepository } from '@contexts/library/domain';
import { type SourceRepository } from '@contexts/library/domain';
import { POST_REPOSITORY } from '@contexts/library/library.di-tokens';
import { SOURCE_REPOSITORY } from '@contexts/library/library.di-tokens';
import { SourcePgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { PostPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post.pg-drizzle.repository';
import * as schema from '@contexts/library/infrastructure/persistence/postgres-drizzle/schema';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { buildPost } from '../../../support/domains/fixtures/post.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';
import { setupPostgresTestingModule } from '../support/setup-postgres-testing-module';

describe('PostPgDrizzleRepository', () => {
  let testingModule: TestingModule;
  let posts: PostRepository;
  let sources: SourceRepository;
  let database: NodePgDatabase<typeof schema>;

  beforeAll(async () => {
    testingModule = await setupPostgresTestingModule([
      { provide: SOURCE_REPOSITORY, useClass: SourcePgDrizzleRepository },
      { provide: POST_REPOSITORY, useClass: PostPgDrizzleRepository },
    ]);
    posts = testingModule.get<PostRepository>(POST_REPOSITORY);
    sources = testingModule.get<SourceRepository>(SOURCE_REPOSITORY);
    database = testingModule.get<NodePgDatabase<typeof schema>>(DATABASE_TOKENS.drizzleDatabase);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  it('post를 저장하고 id로 조회한다', async () => {
    const source = await sources.insert(buildSource({ externalSourceId: 'Notes/post-repo-get.md' }));
    const post = buildPost({ sourceId: source.id, title: '조회 테스트' });

    await posts.insert(post);
    const result = await posts.get({ id: post.id });

    expect(result.id).toBe(post.id);
    expect(result.sourceId).toBe(source.id);
    expect(result.getProps().viewCount.unpack()).toBe(0);
  });

  it('post를 갱신한다', async () => {
    const source = await sources.insert(buildSource({ externalSourceId: 'Notes/post-repo-update.md' }));
    const post = buildPost({ sourceId: source.id });
    await posts.insert(post);

    post.incrementViewCount();
    await posts.update(post);
    const result = await posts.get({ id: post.id });

    expect(result.getProps().viewCount.unpack()).toBe(1);
  });

  // nocap: library-post-6
  it('조회수를 갱신해도 수정 시각은 바뀌지 않는다', async () => {
    const source = await sources.insert(buildSource({ externalSourceId: 'Notes/post-repo-update-updated-at.md' }));
    const inserted = await posts.insert(buildPost({ sourceId: source.id }));

    inserted.incrementViewCount();
    await posts.update(inserted);
    const result = await posts.get({ id: inserted.id });

    expect(result.updatedAt).toEqual(inserted.updatedAt);
  });

  it('존재하지 않는 id는 NotFoundError를 throw한다', async () => {
    await expect(posts.get({ id: 'non-existent-id' })).rejects.toMatchObject({
      kind: 'not_found',
      code: 'post.not_found',
    });
  });

  it('존재하지 않는 post를 update하면 NotFoundError를 throw한다', async () => {
    const source = await sources.insert(buildSource({ externalSourceId: 'Notes/post-repo-update-missing.md' }));
    const post = buildPost({ sourceId: source.id });

    await expect(posts.update(post)).rejects.toMatchObject({
      kind: 'not_found',
      code: 'post.not_found',
    });
  });

  // nocap: library-post-1
  it('같은 sourceId로 두 번 insert하면 constraint_violation exception을 발생시킨다', async () => {
    const source = await sources.insert(buildSource({ externalSourceId: 'Notes/post-repo-conflict.md' }));
    const post1 = buildPost({ sourceId: source.id });
    const post2 = buildPost({ sourceId: source.id });
    await posts.insert(post1);

    await expect(posts.insert(post2)).rejects.toMatchObject({
      kind: 'constraint_violation',
      code: 'post.already_exists',
    });
  });

  // nocap: library-post-8
  it('post를 지우면 그 post의 방문 기록과 요약도 함께 지운다', async () => {
    const source = await sources.insert(buildSource({ externalSourceId: 'Notes/post-repo-delete-children.md' }));
    const post = await posts.insert(buildPost({ sourceId: source.id }));
    await database.insert(schema.postViews).values({ postId: post.id, ip: '203.0.113.1', client: 'browser', viewedAt: new Date() });
    await database.insert(schema.postSummaries).values({ postId: post.id, fingerprint: 'fingerprint-1', finishedAt: new Date() });

    await posts.delete({ id: post.id });

    const views = await database.select().from(schema.postViews).where(eq(schema.postViews.postId, post.id));
    const summaries = await database.select().from(schema.postSummaries).where(eq(schema.postSummaries.postId, post.id));
    expect(views).toEqual([]);
    expect(summaries).toEqual([]);
  });

  // nocap: library-post-8
  it('post를 지워도 source는 남는다', async () => {
    const source = await sources.insert(buildSource({ externalSourceId: 'Notes/post-repo-delete-source.md' }));
    const post = await posts.insert(buildPost({ sourceId: source.id }));

    await posts.delete({ id: post.id });

    await expect(posts.get({ id: post.id })).rejects.toMatchObject({ code: 'post.not_found' });
    await expect(sources.get({ id: source.id })).resolves.toMatchObject({ id: source.id });
  });

  it('존재하지 않는 post를 delete하면 NotFoundError를 throw한다', async () => {
    await expect(posts.delete({ id: 'non-existent-id' })).rejects.toMatchObject({
      kind: 'not_found',
      code: 'post.not_found',
    });
  });
});
