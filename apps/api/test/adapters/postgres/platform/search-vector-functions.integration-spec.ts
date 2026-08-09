import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type PostRepository } from '@contexts/posts/domain';
import { type SourceRepository } from '@contexts/sources/domain';
import { POST_REPOSITORY } from '@contexts/posts/posts.di-tokens';
import { SOURCE_REPOSITORY } from '@contexts/sources/sources.di-tokens';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { AppModule } from '@platform/nest/app.module';
import { buildPost } from '../../../support/domains/fixtures/post.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';

describe('Search vector Postgres functions', () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let posts: PostRepository;
  let sources: SourceRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get(DATABASE_TOKENS.drizzleDatabase);
    posts = app.get<PostRepository>(POST_REPOSITORY);
    sources = app.get<SourceRepository>(SOURCE_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('bigram_tokens', () => {
    it('null 입력이면 빈 문자열을 반환한다', async () => {
      const result = await db.execute<{ tokens: string }>(
        sql`SELECT bigram_tokens(${null}) AS tokens`,
      );

      expect(result.rows[0]?.tokens).toBe('');
    });

    it('공백만 있는 입력이면 빈 문자열을 반환한다', async () => {
      const result = await db.execute<{ tokens: string }>(
        sql`SELECT bigram_tokens(${'   '}) AS tokens`,
      );

      expect(result.rows[0]?.tokens).toBe('');
    });

    it('2자 이하 단어는 분리하지 않고 그대로 유지한다', async () => {
      const result = await db.execute<{ tokens: string }>(
        sql`SELECT bigram_tokens(${'AI'}) AS tokens`,
      );

      expect(result.rows[0]?.tokens).toBe('AI');
    });

    it('3자 이상 한글 단어는 2글자 단위로 겹치게 분리한다', async () => {
      const result = await db.execute<{ tokens: string }>(
        sql`SELECT bigram_tokens(${'소켓은'}) AS tokens`,
      );

      expect(result.rows[0]?.tokens).toBe('소켓 켓은');
    });

    it('3자 이상 영어 단어도 동일하게 2글자 단위로 분리한다', async () => {
      const result = await db.execute<{ tokens: string }>(
        sql`SELECT bigram_tokens(${'Go1234'}) AS tokens`,
      );

      expect(result.rows[0]?.tokens).toBe('Go o1 12 23 34');
    });

    it('공백으로 구분된 여러 단어를 각각 독립적으로 토큰화한다', async () => {
      const result = await db.execute<{ tokens: string }>(
        sql`SELECT bigram_tokens(${'머신러닝 모델'}) AS tokens`,
      );

      expect(result.rows[0]?.tokens).toBe('머신 신러 러닝 모델');
    });
  });

  describe('bigram_tsquery', () => {
    it('토큰 하나만 일치해도 매칭되는 OR tsquery를 만든다', async () => {
      const result = await db.execute<{ matches: boolean }>(sql`
        SELECT to_tsvector('simple', ${'ab'}) @@ bigram_tsquery(${'abc'}) AS matches
      `);

      expect(result.rows[0]?.matches).toBe(true);
    });

    it('겹치는 bigram이 하나도 없으면 매칭되지 않는다', async () => {
      const result = await db.execute<{ matches: boolean }>(sql`
        SELECT to_tsvector('simple', ${'xyz999'}) @@ bigram_tsquery(${'abc'}) AS matches
      `);

      expect(result.rows[0]?.matches).toBe(false);
    });
  });

  describe('posts.title_search_vector', () => {
    it('post를 저장하면 title 기반으로 자동 계산된다', async () => {
      const source = await sources.save(
        buildSource({ externalSourceId: 'Notes/svf-title-insert.md' }),
      );
      const post = buildPost({
        sourceId: source.id,
        title: '고유한검색어제목',
      });
      await posts.save(post);

      const result = await db.execute<{ vector: string }>(sql`
        SELECT title_search_vector::text AS vector
        FROM posts
        WHERE id = ${post.id}
      `);

      expect(result.rows[0]?.vector).toContain('검색');
    });

    it('title을 UPDATE하면 title_search_vector도 다시 계산된다', async () => {
      const source = await sources.save(
        buildSource({ externalSourceId: 'Notes/svf-title-update.md' }),
      );
      const post = buildPost({ sourceId: source.id, title: '원래제목' });
      await posts.save(post);

      await db.execute(sql`
        UPDATE posts SET title = ${'완전히새로운제목'} WHERE id = ${post.id}
      `);

      const result = await db.execute<{ vector: string }>(sql`
        SELECT title_search_vector::text AS vector
        FROM posts
        WHERE id = ${post.id}
      `);

      expect(result.rows[0]?.vector).toContain('새로');
      expect(result.rows[0]?.vector).not.toContain('원래');
    });

    it('title_search_vector에 직접 쓰려고 하면 에러가 발생한다', async () => {
      const source = await sources.save(
        buildSource({ externalSourceId: 'Notes/svf-title-direct-write.md' }),
      );
      const post = buildPost({ sourceId: source.id });
      await posts.save(post);

      await expect(
        db.execute(sql`
          UPDATE posts SET title_search_vector = ''::tsvector WHERE id = ${post.id}
        `),
      ).rejects.toThrow();
    });
  });

  describe('sources.content_search_vector', () => {
    it('source를 저장하면 content 기반으로 자동 계산된다', async () => {
      const source = await sources.save(
        buildSource({
          externalSourceId: 'Notes/svf-content-insert.md',
          content: '고유한검색어콘텐츠',
        }),
      );

      const result = await db.execute<{ vector: string }>(sql`
        SELECT content_search_vector::text AS vector
        FROM sources
        WHERE id = ${source.id}
      `);

      expect(result.rows[0]?.vector).toContain('검색');
    });

    it('content를 UPDATE하면 content_search_vector도 다시 계산된다', async () => {
      const source = await sources.save(
        buildSource({
          externalSourceId: 'Notes/svf-content-update.md',
          content: '원래콘텐츠',
        }),
      );

      await db.execute(sql`
        UPDATE sources SET content = ${'완전히다른콘텐츠내용'} WHERE id = ${source.id}
      `);

      const result = await db.execute<{ vector: string }>(sql`
        SELECT content_search_vector::text AS vector
        FROM sources
        WHERE id = ${source.id}
      `);

      expect(result.rows[0]?.vector).toContain('다른');
      expect(result.rows[0]?.vector).not.toContain('원래');
    });
  });
});
