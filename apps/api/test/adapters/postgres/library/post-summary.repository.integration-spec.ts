import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type TestingModule } from '@nestjs/testing';
import { eq, sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  PostSummary,
  SourceFingerprint,
  type PostRepository,
  type PostSummaryRepository,
  type SourceRepository,
} from '@contexts/library/domain';
import { POST_REPOSITORY, POST_SUMMARY_REPOSITORY, SOURCE_REPOSITORY } from '@contexts/library/library.di-tokens';
import * as schema from '@contexts/library/infrastructure/persistence/postgres-drizzle/schema';
import { SourcePgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { PostPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post.pg-drizzle.repository';
import { PostSummaryPgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/post-summary.pg-drizzle.repository';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { buildPost } from '../../../support/domains/fixtures/post.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';
import { setupPostgresTestingModule } from '../support/setup-postgres-testing-module';

const FINISHED_AT = new Date('2026-11-21T10:00:00Z');

describe('PostSummaryPgDrizzleRepository', () => {
  let testingModule: TestingModule;
  let summaries: PostSummaryRepository;
  let posts: PostRepository;
  let sources: SourceRepository;
  let database: NodePgDatabase<typeof schema>;

  beforeAll(async () => {
    testingModule = await setupPostgresTestingModule([
      { provide: SOURCE_REPOSITORY, useClass: SourcePgDrizzleRepository },
      { provide: POST_REPOSITORY, useClass: PostPgDrizzleRepository },
      { provide: POST_SUMMARY_REPOSITORY, useClass: PostSummaryPgDrizzleRepository },
    ]);
    summaries = testingModule.get<PostSummaryRepository>(POST_SUMMARY_REPOSITORY);
    posts = testingModule.get<PostRepository>(POST_REPOSITORY);
    sources = testingModule.get<SourceRepository>(SOURCE_REPOSITORY);
    database = testingModule.get<NodePgDatabase<typeof schema>>(DATABASE_TOKENS.drizzleDatabase);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  async function insertPost(externalSourceId: string): Promise<string> {
    const source = await sources.insert(buildSource({ externalSourceId }));
    const post = await posts.insert(buildPost({ sourceId: source.id }));

    return post.id;
  }

  function buildCompleted(postId: string, fingerprint = 'fingerprint-1'): PostSummary {
    return PostSummary.complete({
      postId,
      fingerprint: SourceFingerprint.of(fingerprint),
      sentences: ['첫째 문장', '둘째 문장'],
      model: 'claude-haiku-5-5',
      finishedAt: FINISHED_AT,
    });
  }

  function buildFailed(postId: string, fingerprint = 'fingerprint-1'): PostSummary {
    return PostSummary.fail({
      postId,
      fingerprint: SourceFingerprint.of(fingerprint),
      finishedAt: FINISHED_AT,
    });
  }

  it('완료한 요약을 저장하고 post 식별자로 찾는다', async () => {
    const postId = await insertPost('Notes/post-summary-completed.md');

    await summaries.upsert(buildCompleted(postId));
    const found = await summaries.find({ postId });

    expect(found?.id).toBe(postId);
    expect(found?.getProps().fingerprint.unpack()).toBe('fingerprint-1');
    expect(found?.getProps().outcome).toEqual({ kind: 'completed', sentences: ['첫째 문장', '둘째 문장'], model: 'claude-haiku-5-5' });
    expect(found?.getProps().finishedAt).toEqual(FINISHED_AT);
  });

  it('실패한 요약을 저장하고 찾는다', async () => {
    const postId = await insertPost('Notes/post-summary-failed.md');

    await summaries.upsert(buildFailed(postId));
    const found = await summaries.find({ postId });

    expect(found?.getProps().outcome).toEqual({ kind: 'failed' });
  });

  it('요약이 없는 post는 null을 돌려준다', async () => {
    const postId = await insertPost('Notes/post-summary-missing.md');

    expect(await summaries.find({ postId })).toBeNull();
  });

  it('같은 post에 다시 저장하면 이전 요약을 통째로 바꾼다', async () => {
    const postId = await insertPost('Notes/post-summary-replace.md');
    await summaries.upsert(buildCompleted(postId, 'fingerprint-1'));

    await summaries.upsert(buildFailed(postId, 'fingerprint-2'));
    const found = await summaries.find({ postId });

    expect(found?.getProps().fingerprint.unpack()).toBe('fingerprint-2');
    expect(found?.getProps().outcome).toEqual({ kind: 'failed' });
  });

  it('source를 지우면 그 post의 요약도 지워진다', async () => {
    const postId = await insertPost('Notes/post-summary-cascade.md');
    await summaries.upsert(buildCompleted(postId));

    await database.delete(schema.sources).where(eq(schema.sources.id, postId));

    expect(await summaries.find({ postId })).toBeNull();
  });

  it('문장과 모델 중 하나만 저장된 행은 복원하지 않는다', async () => {
    const postId = await insertPost('Notes/post-summary-partial.md');
    await database.execute(
      sql`INSERT INTO post_summaries (post_id, fingerprint, sentences, model, finished_at) VALUES (${postId}, 'fingerprint-1', NULL, 'claude-haiku-5-5', ${FINISHED_AT})`,
    );

    await expect(summaries.find({ postId })).rejects.toMatchObject({
      kind: 'invariant_violation',
      code: 'post_summary.partial_outcome',
    });
  });
});
