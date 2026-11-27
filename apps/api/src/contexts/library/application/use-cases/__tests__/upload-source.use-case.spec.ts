import { InvalidDataError } from '@core/errors';
import { sha256Hex } from '@core/hash';
import {
  Source,
  SourceSyncJob,
  type SourceFrontmatterProps,
  type SourceRepository,
  type SourceSyncJobRepository,
} from '@contexts/library/domain';
import { type OutboxWriter } from '@kernels/application';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { UploadSourceUseCase } from '../upload-source.use-case';
import { type LibraryUnitOfWork, type SourceDocumentParser } from '../../ports';
import { buildSource, sourceContentByteSize, sourceContentOf } from '../../../../../../test/support/domains/fixtures/source.fixture';

type DocumentParserMock = {
  parse: MockedFunction<SourceDocumentParser['parse']>;
};

type SourceRepositoryMock = {
  find: MockedFunction<SourceRepository['find']>;
  get: MockedFunction<SourceRepository['get']>;
  insert: MockedFunction<SourceRepository['insert']>;
  update: MockedFunction<SourceRepository['update']>;
  delete: MockedFunction<SourceRepository['delete']>;
};

type SourceSyncJobRepositoryMock = {
  get: MockedFunction<SourceSyncJobRepository['get']>;
  find: MockedFunction<SourceSyncJobRepository['find']>;
  findLatest: MockedFunction<SourceSyncJobRepository['findLatest']>;
  insert: MockedFunction<SourceSyncJobRepository['insert']>;
  update: MockedFunction<SourceSyncJobRepository['update']>;
};

type OutboxWriterMock = {
  append: MockedFunction<OutboxWriter['append']>;
};

describe('UploadSourceUseCase', () => {
  // nocap: library-sync-7
  it('새 source를 저장하고 sync job을 생성한다', async () => {
    const documentParser = createDocumentParserMock({
      content: '# Source note',
    });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const outbox = createOutboxWriterMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs, outbox));

    const result = await useCase.execute({
      externalSourceId: ' Notes/source.md ',
      content: '# Source note',
    });

    expect(result).toMatchObject({
      externalSourceId: 'Notes/source.md',
      fingerprint: sha256Hex('# Source note'),
    });
    expect(result.sourceId.length).toBeGreaterThan(0);
    expect(result.syncJobId?.length).toBeGreaterThan(0);
    expect(documentParser.parse).toHaveBeenCalledWith('# Source note');
    expect(sources.find).toHaveBeenCalledWith({
      externalSourceId: 'Notes/source.md',
    });
    expectSourceSavedWith(sources, {
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });
    expectSyncJobSavedWith(syncJobs, {
      sourceId: sourceWriteCalls(sources)[0]?.[0]?.id,
      fingerprint: sha256Hex('# Source note'),
    });
    const savedSyncJob = syncJobs.insert.mock.calls[0]?.[0];
    expect(outbox.append).toHaveBeenCalledOnce();
    const appendedMessage = outbox.append.mock.calls[0]?.[0];
    expect(appendedMessage).toMatchObject({
      eventType: 'source.sync_job.created',
      eventVersion: 1,
      payload: {
        sourceId: savedSyncJob?.getProps().sourceId,
        syncJobId: savedSyncJob?.id,
        content: '# Source note',
      },
    });
    expect(appendedMessage?.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(appendedMessage?.occurredAt).toBeInstanceOf(Date);
    expect(savedSyncJob?.domainEvents).toEqual([]);
  });

  // nocap: library-sync-7
  // nocap: library-sync-8
  it('같은 content snapshot이고 최근 sync job이 completed면 저장과 sync job 생성을 건너뛴다', async () => {
    const existingSource = restoreSource({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });
    const documentParser = createDocumentParserMock({
      content: '# Source note',
    });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    syncJobs.findLatest.mockResolvedValue(restoreSyncJob({ sourceId: 'source-1', status: 'completed' }));
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result).toEqual({
      sourceId: 'source-1',
      externalSourceId: 'Notes/source.md',
      fingerprint: sha256Hex('# Source note'),
    });
    expect(sourceWriteCalls(sources)).toHaveLength(0);
    expect(syncJobs.insert).not.toHaveBeenCalled();
  });

  // nocap: library-sync-7
  it('본문이 같아도 최근 completed sync job의 fingerprint가 다르면 sync job을 생성한다', async () => {
    const existingSource = restoreSource({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });
    const documentParser = createDocumentParserMock({
      content: '# Source note',
    });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    syncJobs.findLatest.mockResolvedValue(
      restoreSyncJob({
        sourceId: 'source-1',
        status: 'completed',
        fingerprint: 'previous-fingerprint',
      }),
    );
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.syncJobId?.length).toBeGreaterThan(0);
    expectSyncJobSavedWith(syncJobs, {
      sourceId: 'source-1',
      fingerprint: sha256Hex('# Source note'),
    });
  });

  // nocap: library-sync-7
  it.each(['waiting'])('같은 content snapshot의 최근 sync job이 %s이면 기존 job을 반환한다', async (status) => {
    const existingSource = restoreSource({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });
    const documentParser = createDocumentParserMock({
      content: '# Source note',
    });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    syncJobs.findLatest.mockResolvedValue(restoreSyncJob({ sourceId: 'source-1', status }));
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.syncJobId).toBe('sync-job-1');
    expect(sourceWriteCalls(sources)).toHaveLength(0);
    expect(syncJobs.insert).not.toHaveBeenCalled();
  });

  // nocap: library-sync-7
  it('같은 content snapshot이라도 최근 sync job이 없으면 sync job을 생성한다', async () => {
    const existingSource = restoreSource({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });
    const documentParser = createDocumentParserMock({
      content: '# Source note',
    });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.syncJobId?.length).toBeGreaterThan(0);
    expectSyncJobSavedWith(syncJobs, {
      sourceId: 'source-1',
      fingerprint: sha256Hex('# Source note'),
    });
  });

  // nocap: library-sync-7
  it('같은 content snapshot이라도 최근 sync job이 completed가 아니면(예: failed) sync job을 다시 생성한다', async () => {
    const existingSource = restoreSource({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });
    const documentParser = createDocumentParserMock({
      content: '# Source note',
    });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    syncJobs.findLatest.mockResolvedValue(restoreSyncJob({ sourceId: 'source-1', status: 'failed' }));
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.syncJobId?.length).toBeGreaterThan(0);
    expectSyncJobSavedWith(syncJobs, {
      sourceId: 'source-1',
      fingerprint: sha256Hex('# Source note'),
    });
  });

  // nocap: library-sync-5
  it('다른 content snapshot이면 source를 갱신하고 sync job을 생성한다', async () => {
    const existingSource = restoreSource({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      content: '# Old source note',
    });
    const documentParser = createDocumentParserMock({
      content: '# New source note',
    });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# New source note',
    });

    expect(result).toMatchObject({
      sourceId: 'source-1',
      externalSourceId: 'Notes/source.md',
      fingerprint: sha256Hex('# New source note'),
    });
    expect(result.syncJobId?.length).toBeGreaterThan(0);
    expectSourceSavedWith(sources, {
      externalSourceId: 'Notes/source.md',
      content: '# New source note',
    });
    expectSyncJobSavedWith(syncJobs, {
      sourceId: 'source-1',
      fingerprint: sha256Hex('# New source note'),
    });
  });

  it('본문이 바뀌면 source 갱신과 같은 transaction에서 본문 변경 메시지를 outbox에 기록한다', async () => {
    const existingSource = restoreSource({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      content: '# Old source note',
    });
    const documentParser = createDocumentParserMock({
      content: '# New source note',
    });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    const outbox = createOutboxWriterMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs, outbox));

    await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# New source note',
    });

    const appendedTypes = outbox.append.mock.calls.map(([message]) => message.eventType);
    expect(appendedTypes).toEqual(['source.body_changed', 'source.sync_job.created']);
    expect(outbox.append.mock.calls[0]?.[0]?.payload).toEqual({ sourceId: 'source-1' });
    expect(existingSource.domainEvents).toEqual([]);
  });

  // nocap: library-sync-5
  // nocap: library-sync-6
  it('본문은 같고 frontmatter만 바뀌었고 최근 sync job이 completed면 source만 갱신한다', async () => {
    const existingSource = restoreSource({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });
    const documentParser = createDocumentParserMock({
      content: '# Source note',
      frontmatter: { sheska: true, tags: ['a'] },
    });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    syncJobs.findLatest.mockResolvedValue(restoreSyncJob({ sourceId: 'source-1', status: 'completed' }));
    const outbox = createOutboxWriterMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs, outbox));

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result).toEqual({
      sourceId: 'source-1',
      externalSourceId: 'Notes/source.md',
      fingerprint: sha256Hex('# Source note'),
    });
    expect(sources.update).toHaveBeenCalledOnce();
    expect(sourceContentOf(sources.update.mock.calls[0][0]).frontmatter).toEqual({ sheska: true, tags: ['a'] });
    expect(syncJobs.insert).not.toHaveBeenCalled();
    expect(outbox.append).not.toHaveBeenCalled();
  });

  // nocap: library-sync-5
  // nocap: library-sync-7
  it('본문은 같고 frontmatter만 바뀌었고 최근 sync job이 waiting이면 source를 갱신하고 그 job을 반환한다', async () => {
    const existingSource = restoreSource({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });
    const documentParser = createDocumentParserMock({
      content: '# Source note',
      frontmatter: { sheska: true, tags: ['a'] },
    });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    syncJobs.findLatest.mockResolvedValue(restoreSyncJob({ sourceId: 'source-1', status: 'waiting' }));
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    const result = await useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    expect(result.syncJobId).toBe('sync-job-1');
    expect(sources.update).toHaveBeenCalledOnce();
    expect(syncJobs.insert).not.toHaveBeenCalled();
  });

  // nocap: library-source-6
  it.each([
    ['문자열 "true"', { sheska: 'true' }],
    ['yes', { sheska: 'yes' }],
    ['1', { sheska: 1 }],
    ['false', { sheska: false }],
    ['없음', {}],
  ])('frontmatter sheska가 %s이면 source를 조회하거나 저장하지 않고 거부한다', async (_label, frontmatter: SourceFrontmatterProps) => {
    const documentParser = createDocumentParserMock({
      content: '# Source note',
      frontmatter,
    });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    await expect(
      useCase.execute({
        externalSourceId: 'Notes/source.md',
        content: '# Source note',
      }),
    ).rejects.toMatchObject({ code: 'source.not_sync_target' });
    expect(sources.find).not.toHaveBeenCalled();
    expect(sourceWriteCalls(sources)).toHaveLength(0);
    expect(syncJobs.insert).not.toHaveBeenCalled();
  });

  it('frontmatter의 시리즈를 source에 담아 저장한다', async () => {
    const documentParser = createDocumentParserMock({
      content: '# Source note',
      frontmatter: { sheska: true, series: ' RAG ', series_order: 2 },
    });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    await useCase.execute({ externalSourceId: 'Notes/source.md', content: '# Source note' });

    expect(sources.insert.mock.calls[0]?.[0].getProps().series.unpack()).toEqual({ kind: 'member', name: 'RAG', order: 2 });
  });

  // nocap: library-source-9
  it('시리즈가 틀리면 source를 조회하거나 저장하지 않고 거부한다', async () => {
    const documentParser = createDocumentParserMock({
      content: '# Source note',
      frontmatter: { sheska: true, series: 'RAG' },
    });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    await expect(useCase.execute({ externalSourceId: 'Notes/source.md', content: '# Source note' })).rejects.toMatchObject({
      kind: 'validation_failed',
      code: 'source.invalid_series',
    });
    expect(sources.find).not.toHaveBeenCalled();
    expect(sourceWriteCalls(sources)).toHaveLength(0);
    expect(syncJobs.insert).not.toHaveBeenCalled();
  });

  it('시리즈를 저장하기 전에 올린 노트를 그대로 다시 올리면 시리즈를 채워 갱신한다', async () => {
    const frontmatter = { sheska: true, series: 'RAG', series_order: 1 };
    const existingSource = Source.restore({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      body: '# Source note',
      frontmatter,
      series: { kind: 'none' },
      project: { kind: 'none' },
      fingerprint: sha256Hex('# Source note'),
      size: sourceContentByteSize('# Source note'),
    });
    const documentParser = createDocumentParserMock({ content: '# Source note', frontmatter });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    syncJobs.findLatest.mockResolvedValue(restoreSyncJob({ sourceId: 'source-1', status: 'completed' }));
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    await useCase.execute({ externalSourceId: 'Notes/source.md', content: '# Source note' });

    expect(sources.update).toHaveBeenCalledOnce();
    expect(sources.update.mock.calls[0]?.[0].getProps().series.unpack()).toEqual({ kind: 'member', name: 'RAG', order: 1 });
    expect(syncJobs.insert).not.toHaveBeenCalled();
  });

  it('frontmatter의 관련 프로젝트를 source에 담아 저장한다', async () => {
    const documentParser = createDocumentParserMock({
      content: '# Source note',
      frontmatter: { sheska: true, project: 'home-cluster' },
    });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    await useCase.execute({ externalSourceId: 'Notes/source.md', content: '# Source note' });

    expect(sources.insert.mock.calls[0]?.[0].getProps().project.unpack()).toEqual({ kind: 'related', slug: 'home-cluster' });
  });

  // nocap: library-source-11
  it('관련 프로젝트가 틀리면 source를 조회하거나 저장하지 않고 거부한다', async () => {
    const documentParser = createDocumentParserMock({
      content: '# Source note',
      frontmatter: { sheska: true, project: 'sheksa' },
    });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    await expect(useCase.execute({ externalSourceId: 'Notes/source.md', content: '# Source note' })).rejects.toMatchObject({
      kind: 'validation_failed',
      code: 'source.invalid_project',
    });
    expect(sources.find).not.toHaveBeenCalled();
    expect(sourceWriteCalls(sources)).toHaveLength(0);
    expect(syncJobs.insert).not.toHaveBeenCalled();
  });

  it('관련 프로젝트를 저장하기 전에 올린 노트를 그대로 다시 올리면 관련 프로젝트를 채워 갱신한다', async () => {
    const frontmatter = { sheska: true, project: 'sheska' };
    const existingSource = Source.restore({
      id: 'source-1',
      externalSourceId: 'Notes/source.md',
      body: '# Source note',
      frontmatter,
      series: { kind: 'none' },
      project: { kind: 'none' },
      fingerprint: sha256Hex('# Source note'),
      size: sourceContentByteSize('# Source note'),
    });
    const documentParser = createDocumentParserMock({ content: '# Source note', frontmatter });
    const sources = createSourceRepositoryMock();
    sources.find.mockResolvedValue(existingSource);
    const syncJobs = createSourceSyncJobRepositoryMock();
    syncJobs.findLatest.mockResolvedValue(restoreSyncJob({ sourceId: 'source-1', status: 'completed' }));
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    await useCase.execute({ externalSourceId: 'Notes/source.md', content: '# Source note' });

    expect(sources.update).toHaveBeenCalledOnce();
    expect(sources.update.mock.calls[0]?.[0].getProps().project.unpack()).toEqual({ kind: 'related', slug: 'sheska' });
    expect(syncJobs.insert).not.toHaveBeenCalled();
  });

  // nocap: library-source-4
  it('문서 형식이 틀린 parser 실패를 호출자가 고칠 오류로 바꿔 거부한다', async () => {
    const documentParser: DocumentParserMock = {
      parse: vi.fn<SourceDocumentParser['parse']>().mockImplementation(() => {
        throw new InvalidDataError({
          code: 'source_document.frontmatter_not_mapping',
          message: 'Frontmatter must be a YAML mapping',
          details: { fields: ['frontmatter'] },
        });
      }),
    };
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    await expect(useCase.execute({ externalSourceId: 'Notes/source.md', content: '# Source note' })).rejects.toMatchObject({
      kind: 'validation_failed',
      code: 'source.invalid_frontmatter',
      details: { fields: [{ path: 'frontmatter', messages: ['Frontmatter must be a YAML mapping'] }] },
    });
    expect(sources.find).not.toHaveBeenCalled();
  });

  it('문서 문제가 아닌 parser 실패는 바꾸지 않고 전파한다', async () => {
    const parserBug = new TypeError('Cannot read properties of undefined');
    const documentParser: DocumentParserMock = {
      parse: vi.fn<SourceDocumentParser['parse']>().mockImplementation(() => {
        throw parserBug;
      }),
    };
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    await expect(useCase.execute({ externalSourceId: 'Notes/source.md', content: '# Source note' })).rejects.toBe(parserBug);
  });

  it('파일 원문 전체의 byte 수를 source 크기로 저장한다', async () => {
    const content = '\uFEFF---\nsheska: true\n---\n# 본문';
    const documentParser = createDocumentParserMock({ body: '# 본문' });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    await useCase.execute({ externalSourceId: 'Notes/source.md', content });

    expect(sourceContentOf(sourceWriteCalls(sources)[0]?.[0]).size).toBe(sourceContentByteSize(content));
  });

  it('externalSourceId가 유효하지 않으면 collaborator를 호출하지 않고 throw한다', async () => {
    const documentParser = createDocumentParserMock();
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    await expect(
      useCase.execute({
        externalSourceId: ' ',
        content: '# Source note',
      }),
    ).rejects.toThrow('External source id cannot be empty');
    expect(documentParser.parse).not.toHaveBeenCalled();
    expect(sources.find).not.toHaveBeenCalled();
    expect(sourceWriteCalls(sources)).toHaveLength(0);
    expect(syncJobs.insert).not.toHaveBeenCalled();
  });

  it('content snapshot 계산 exception을 전파한다', async () => {
    const calculationFailure = new Error('Source document parser failed');
    const documentParser = createDocumentParserMock();
    documentParser.parse.mockImplementation(() => {
      throw calculationFailure;
    });
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    const result = useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    await expect(result).rejects.toBe(calculationFailure);
    expect(sources.find).not.toHaveBeenCalled();
    expect(sourceWriteCalls(sources)).toHaveLength(0);
    expect(syncJobs.insert).not.toHaveBeenCalled();
  });

  it('source 조회 exception을 전파한다', async () => {
    const findFailure = new Error('Source Repository operation failed');
    const documentParser = createDocumentParserMock();
    const sources = createSourceRepositoryMock();
    sources.find.mockRejectedValue(findFailure);
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    const result = useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    await expect(result).rejects.toThrow('Source Repository operation failed');
    expect(sourceWriteCalls(sources)).toHaveLength(0);
    expect(syncJobs.insert).not.toHaveBeenCalled();
  });

  it('source 저장 exception을 전파하고 sync job은 저장하지 않는다', async () => {
    const saveFailure = new Error('Source Repository operation failed');
    const documentParser = createDocumentParserMock();
    const sources = createSourceRepositoryMock();
    sources.insert.mockRejectedValue(saveFailure);
    sources.update.mockRejectedValue(saveFailure);
    const syncJobs = createSourceSyncJobRepositoryMock();
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    const result = useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    await expect(result).rejects.toThrow('Source Repository operation failed');
    expect(syncJobs.insert).not.toHaveBeenCalled();
  });

  it('sync job 저장 exception을 전파한다', async () => {
    const syncJobSaveFailure = new Error('Source Sync Job Repository operation failed');
    const documentParser = createDocumentParserMock();
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    syncJobs.insert.mockRejectedValue(syncJobSaveFailure);
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs));

    const result = useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    await expect(result).rejects.toThrow('Source Sync Job Repository operation failed');
    expect(sourceWriteCalls(sources)).toHaveLength(1);
  });

  it('outbox 저장 exception을 전파하고 domain event를 유지한다', async () => {
    const outboxFailure = new Error('Outbox operation failed');
    const documentParser = createDocumentParserMock();
    const sources = createSourceRepositoryMock();
    const syncJobs = createSourceSyncJobRepositoryMock();
    const outbox = createOutboxWriterMock();
    outbox.append.mockRejectedValue(outboxFailure);
    const useCase = new UploadSourceUseCase(documentParser, sources, syncJobs, createLibraryUnitOfWorkMock(sources, syncJobs, outbox));

    const result = useCase.execute({
      externalSourceId: 'Notes/source.md',
      content: '# Source note',
    });

    await expect(result).rejects.toBe(outboxFailure);
    expect(sourceWriteCalls(sources)).toHaveLength(1);
    expect(syncJobs.insert).toHaveBeenCalledOnce();
    expect(syncJobs.insert.mock.calls[0]?.[0]?.domainEvents).toHaveLength(1);
  });
});

function createDocumentParserMock(
  document: {
    content?: string;
    body?: string;
    frontmatter?: SourceFrontmatterProps;
  } = { content: '# Source note' },
): DocumentParserMock {
  const body = document.body ?? document.content ?? '';
  return {
    parse: vi.fn<SourceDocumentParser['parse']>().mockReturnValue({
      body,
      frontmatter: document.frontmatter ?? { sheska: true },
    }),
  };
}

function createSourceRepositoryMock(): SourceRepositoryMock {
  return {
    find: vi.fn<SourceRepository['find']>().mockResolvedValue(null),
    get: vi.fn<SourceRepository['get']>().mockResolvedValue(buildSource()),
    insert: vi.fn<SourceRepository['insert']>().mockImplementation((source) => Promise.resolve(source)),
    update: vi.fn<SourceRepository['update']>().mockImplementation((source) => Promise.resolve(source)),
    delete: vi.fn<SourceRepository['delete']>(),
  };
}

function createSourceSyncJobRepositoryMock(): SourceSyncJobRepositoryMock {
  return {
    get: vi.fn<SourceSyncJobRepository['get']>().mockResolvedValue(restoreSyncJob({ sourceId: 'source-1', status: 'waiting' })),
    find: vi.fn<SourceSyncJobRepository['find']>().mockResolvedValue(null),
    findLatest: vi.fn<SourceSyncJobRepository['findLatest']>().mockResolvedValue(null),
    insert: vi.fn<SourceSyncJobRepository['insert']>().mockImplementation((syncJob) => Promise.resolve(syncJob)),
    update: vi.fn<SourceSyncJobRepository['update']>().mockImplementation((syncJob) => Promise.resolve(syncJob)),
  };
}

function sourceWriteCalls(sources: SourceRepositoryMock) {
  return [...sources.insert.mock.calls, ...sources.update.mock.calls];
}

function createLibraryUnitOfWorkMock(
  sources: SourceRepositoryMock,
  syncJobs: SourceSyncJobRepositoryMock,
  outbox: OutboxWriterMock = createOutboxWriterMock(),
): LibraryUnitOfWork {
  return {
    execute: (work) => work({ sources, syncJobs, outbox, posts: {} as never }),
  };
}

function createOutboxWriterMock(): OutboxWriterMock {
  return {
    append: vi.fn<OutboxWriter['append']>().mockResolvedValue(undefined),
  };
}

function restoreSyncJob(params: { sourceId: string; fingerprint?: string; status: string }): SourceSyncJob {
  return SourceSyncJob.restore({
    id: 'sync-job-1',
    sourceId: params.sourceId,
    fingerprint: params.fingerprint ?? sha256Hex('# Source note'),
    status: params.status,
  });
}

function expectSourceSavedWith(
  sources: ReturnType<typeof createSourceRepositoryMock>,
  expected: {
    externalSourceId: string;
    content: string;
  },
) {
  expect(sourceWriteCalls(sources)).toHaveLength(1);
  const savedSource = sourceWriteCalls(sources)[0]?.[0];
  expect(savedSource?.getProps().externalSourceId.unpack()).toBe(expected.externalSourceId);
  expect(sourceContentOf(savedSource)).toEqual({
    body: expected.content,
    fingerprint: sha256Hex(expected.content),
    frontmatter: { sheska: true },
    series: { kind: 'none' },
    project: { kind: 'none' },
    title: expected.externalSourceId,
    size: sourceContentByteSize(expected.content),
  });
}

function expectSyncJobSavedWith(
  syncJobs: ReturnType<typeof createSourceSyncJobRepositoryMock>,
  expected: {
    sourceId: string | undefined;
    fingerprint: string;
  },
) {
  expect(syncJobs.insert).toHaveBeenCalledOnce();
  const savedSyncJob = syncJobs.insert.mock.calls[0]?.[0];
  expect(sourceSyncJobProps(savedSyncJob)).toMatchObject({
    sourceId: expected.sourceId,
    fingerprint: expected.fingerprint,
    status: 'waiting',
  });
}

function sourceSyncJobProps(syncJob: SourceSyncJob | undefined) {
  const props = syncJob?.getProps();

  return {
    sourceId: props?.sourceId,
    fingerprint: props?.fingerprint.unpack(),
    status: props?.status,
  };
}

function restoreSource(params: { id: string; externalSourceId: string; content: string }) {
  return Source.restore({
    id: params.id,
    externalSourceId: params.externalSourceId,
    body: params.content,
    frontmatter: { sheska: true },
    series: { kind: 'none' },
    project: { kind: 'none' },
    fingerprint: sha256Hex(params.content),
    size: sourceContentByteSize(params.content),
  });
}
