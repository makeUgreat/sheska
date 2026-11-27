import { sha256Hex } from '@core/hash';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type SourceEmbeddingRepository } from '@contexts/ingestion/domain';
import { SourceEmbeddingPgDrizzleRepository } from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/source-embedding.pg-drizzle.repository';
import * as ingestionSchema from '@contexts/ingestion/infrastructure/persistence/postgres-drizzle/schema';
import { SOURCE_EMBEDDING_REPOSITORY } from '@contexts/ingestion/ingestion.di-tokens';
import { SourceFrontmatter, SourceSeries, type SourceRepository } from '@contexts/library/domain';
import * as schema from '@contexts/library/infrastructure/persistence/postgres-drizzle/schema';
import { SourcePgDrizzleRepository } from '@contexts/library/infrastructure/persistence/postgres-drizzle/source.pg-drizzle.repository';
import { SOURCE_REPOSITORY } from '@contexts/library/library.di-tokens';
import { DATABASE_TOKENS } from '@kernels/infrastructure';
import { buildSourceEmbedding } from '../../../support/domains/fixtures/source-embedding.fixture';
import { buildSource, sourceContentByteSize, sourceContentOf } from '../../../support/domains/fixtures/source.fixture';
import { setupPostgresTestingModule } from '../support/setup-postgres-testing-module';

describe('SourceDrizzleRepository', () => {
  let testingModule: TestingModule;
  let repository: SourceRepository;
  let embeddings: SourceEmbeddingRepository;
  let database: NodePgDatabase<typeof schema>;

  beforeAll(async () => {
    testingModule = await setupPostgresTestingModule([
      { provide: SOURCE_REPOSITORY, useClass: SourcePgDrizzleRepository },
      { provide: SOURCE_EMBEDDING_REPOSITORY, useClass: SourceEmbeddingPgDrizzleRepository },
    ]);
    repository = testingModule.get<SourceRepository>(SOURCE_REPOSITORY);
    embeddings = testingModule.get<SourceEmbeddingRepository>(SOURCE_EMBEDDING_REPOSITORY);
    database = testingModule.get<NodePgDatabase<typeof schema>>(DATABASE_TOKENS.drizzleDatabase);
  });

  afterAll(async () => {
    await testingModule.close();
  });

  it('source를 저장하고 externalSourceId로 조회한다', async () => {
    const externalSourceId = 'Notes/find-source.md';
    const source = buildSource({ externalSourceId });

    const saveResult = await repository.insert(source);
    const findResult = await repository.find({ externalSourceId });

    expect(saveResult.id).toBe(source.id);
    expect(findResult?.id).toBe(source.id);
    expect(sourceContentOf(findResult!)).toEqual({
      body: '# Source note',
      fingerprint: sha256Hex('# Source note'),
      frontmatter: { sheska: true },
      series: { kind: 'none' },
      title: externalSourceId,
      size: sourceContentByteSize('# Source note'),
    });
  });

  it('source를 갱신한다', async () => {
    const externalSourceId = 'Notes/update-source.md';
    const source = buildSource({ externalSourceId });
    await repository.insert(source);

    source.syncContent({
      body: '# Changed source note',
      frontmatter: SourceFrontmatter.parse({ sheska: true }),
      series: SourceSeries.none(),
      size: sourceContentByteSize('# Changed source note'),
    });

    const saveResult = await repository.update(source);
    const findResult = await repository.find({ externalSourceId });

    expect(saveResult.id).toBe(source.id);
    expect(sourceContentOf(findResult!)).toEqual({
      body: '# Changed source note',
      fingerprint: sha256Hex('# Changed source note'),
      frontmatter: { sheska: true },
      series: { kind: 'none' },
      title: externalSourceId,
      size: sourceContentByteSize('# Changed source note'),
    });
  });

  it('시리즈를 저장하고 조회한다', async () => {
    const externalSourceId = 'Notes/series-source.md';
    const source = buildSource({ externalSourceId, frontmatter: { series: 'RAG', series_order: 2 } });

    await repository.insert(source);
    const findResult = await repository.find({ externalSourceId });

    expect(findResult?.getProps().series.unpack()).toEqual({ kind: 'member', name: 'RAG', order: 2 });
  });

  it('시리즈를 지우면 시리즈 열을 비운다', async () => {
    const externalSourceId = 'Notes/series-removed-source.md';
    const source = buildSource({ externalSourceId, frontmatter: { series: 'RAG', series_order: 2 } });
    await repository.insert(source);

    source.syncContent({
      body: '# Source note',
      frontmatter: SourceFrontmatter.parse({ sheska: true }),
      series: SourceSeries.none(),
      size: sourceContentByteSize('# Source note'),
    });
    await repository.update(source);
    const [row] = await database.select().from(schema.sources).where(eq(schema.sources.externalSourceId, externalSourceId));

    expect(row).toMatchObject({ series: null, seriesOrder: null });
  });

  it('id로 source를 조회한다', async () => {
    const source = buildSource({
      externalSourceId: 'Notes/find-source-by-id.md',
    });
    await repository.insert(source);

    const result = await repository.find({ id: source.id });

    expect(result?.id).toBe(source.id);
    expect(sourceContentOf(result!)).toEqual({
      body: '# Source note',
      fingerprint: sha256Hex('# Source note'),
      frontmatter: { sheska: true },
      series: { kind: 'none' },
      title: 'Notes/find-source-by-id.md',
      size: sourceContentByteSize('# Source note'),
    });
  });

  it('존재하지 않는 id는 null을 반환한다', async () => {
    const result = await repository.find({ id: 'non-existent-id' });

    expect(result).toBeNull();
  });

  it('존재하지 않는 id는 NotFoundError를 throw한다', async () => {
    await expect(repository.get({ id: 'non-existent-id' })).rejects.toMatchObject({
      kind: 'not_found',
      code: 'source.not_found',
    });
  });

  // nocap: library-source-2
  it('externalSourceId unique 충돌을 exception으로 전파한다', async () => {
    const externalSourceId = 'Notes/conflict-source.md';
    const firstSource = buildSource({ externalSourceId });
    const secondSource = buildSource({
      externalSourceId,
      content: '# Another source note',
    });

    await repository.insert(firstSource);

    await expect(repository.insert(secondSource)).rejects.toMatchObject({
      kind: 'constraint_violation',
      code: 'source.external_source_id_already_exists',
    });
  });

  describe('경로 옮기기', () => {
    it('옮긴 source는 같은 식별자와 post를 유지하고 새 경로로 찾힌다', async () => {
      const source = await repository.insert(buildSource({ externalSourceId: 'Notes/move-before.md' }));
      await database.insert(schema.posts).values({ id: source.id });

      source.moveTo('Notes/move-after.md');
      await repository.update(source);

      await expect(repository.find({ externalSourceId: 'Notes/move-before.md' })).resolves.toBeNull();
      await expect(repository.find({ externalSourceId: 'Notes/move-after.md' })).resolves.toMatchObject({ id: source.id });
      await expect(database.select().from(schema.posts).where(eq(schema.posts.id, source.id))).resolves.toHaveLength(1);
    });

    it('frontmatter title이 없으면 저장된 제목도 새 경로로 바뀐다', async () => {
      const source = await repository.insert(buildSource({ externalSourceId: 'Notes/move-title-before.md' }));

      source.moveTo('Notes/move-title-after.md');
      await repository.update(source);

      const [row] = await database.select({ title: schema.sources.title }).from(schema.sources).where(eq(schema.sources.id, source.id));
      expect(row.title).toBe('Notes/move-title-after.md');
    });
  });

  describe('delete', () => {
    async function insertSourceWithDependents(externalSourceId: string): Promise<string> {
      const source = await repository.insert(buildSource({ externalSourceId }));
      await database.insert(schema.posts).values({ id: source.id });
      await database.insert(schema.postViews).values({ postId: source.id, ip: '203.0.113.1', client: 'browser', viewedAt: new Date() });
      await database.insert(schema.postSummaries).values({ postId: source.id, fingerprint: 'fingerprint-1', finishedAt: new Date() });
      await database
        .insert(schema.sourceSyncJobs)
        .values({ id: `${source.id}-job`, sourceId: source.id, fingerprint: 'fingerprint-1', status: 'completed' });
      await embeddings.upsert(buildSourceEmbedding({ sourceId: source.id }));

      return source.id;
    }

    // nocap: library-source-8
    it('source를 지우면 그 source의 post, 방문 기록, 요약, sync job도 지운다', async () => {
      const sourceId = await insertSourceWithDependents('Notes/delete-source-dependents.md');

      await repository.delete({ id: sourceId });

      await expect(repository.find({ id: sourceId })).resolves.toBeNull();
      await expect(database.select().from(schema.posts).where(eq(schema.posts.id, sourceId))).resolves.toEqual([]);
      await expect(database.select().from(schema.postViews).where(eq(schema.postViews.postId, sourceId))).resolves.toEqual([]);
      await expect(database.select().from(schema.postSummaries).where(eq(schema.postSummaries.postId, sourceId))).resolves.toEqual([]);
      await expect(database.select().from(schema.sourceSyncJobs).where(eq(schema.sourceSyncJobs.sourceId, sourceId))).resolves.toEqual([]);
    });

    // nocap: ingestion-sourceEmbedding-6
    it('source를 지우면 그 source의 임베딩도 지운다', async () => {
      const sourceId = await insertSourceWithDependents('Notes/delete-source-embeddings.md');

      await repository.delete({ id: sourceId });

      await expect(embeddings.find({ sourceId })).resolves.toBeNull();
      await expect(
        database.select().from(ingestionSchema.sourceEmbeddings).where(eq(ingestionSchema.sourceEmbeddings.sourceId, sourceId)),
      ).resolves.toEqual([]);
    });

    it('다른 source의 행은 남긴다', async () => {
      const deletedId = await insertSourceWithDependents('Notes/delete-source-target.md');
      const keptId = await insertSourceWithDependents('Notes/delete-source-kept.md');

      await repository.delete({ id: deletedId });

      await expect(repository.find({ id: keptId })).resolves.not.toBeNull();
      await expect(embeddings.find({ sourceId: keptId })).resolves.not.toBeNull();
    });

    it('없는 source를 지우면 NotFoundError를 throw한다', async () => {
      await expect(repository.delete({ id: 'non-existent-id' })).rejects.toMatchObject({
        kind: 'not_found',
        code: 'source.not_found',
      });
    });
  });
});
