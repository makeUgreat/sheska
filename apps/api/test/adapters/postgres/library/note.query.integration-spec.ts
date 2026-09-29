import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type NoteQuery } from '@contexts/library/application/ports';
import {
  type PostRepository,
  type SourceRepository,
} from '@contexts/library/domain';
import {
  NOTE_QUERY,
  POST_REPOSITORY,
  SOURCE_REPOSITORY,
} from '@contexts/library/library.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import { buildPost } from '../../../support/domains/fixtures/post.fixture';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';

describe('NotePgDrizzleQuery', () => {
  let app: INestApplication;
  let notes: NoteQuery;
  let sources: SourceRepository;
  let posts: PostRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    notes = app.get<NoteQuery>(NOTE_QUERY);
    sources = app.get<SourceRepository>(SOURCE_REPOSITORY);
    posts = app.get<PostRepository>(POST_REPOSITORY);
  });

  afterAll(async () => app.close());

  it('source를 정규화된 note 상세 read model로 반환한다', async () => {
    const source = await sources.insert(
      buildSource({
        externalSourceId: 'Notes/note-query-get.md',
        body: '# Retry body',
        frontmatter: {
          title: 'Retry Amplification',
          aliases: ['Nested Retries', 1],
          keywords: ['retry'],
          custom: { status: 'draft' },
        },
        title: 'Retry Amplification',
      }),
    );

    const result = await notes.get({ noteId: source.id });

    expect(result).toMatchObject({
      noteId: source.id,
      sourceId: source.id,
      externalSourceId: 'Notes/note-query-get.md',
      title: 'Retry Amplification',
      aliases: ['Nested Retries'],
      keywords: ['retry'],
      body: '# Retry body',
      frontmatter: {
        custom: { status: 'draft' },
      },
    });
  });

  it('frontmatter title이 없으면 externalSourceId를 title로 사용한다', async () => {
    const source = await sources.insert(
      buildSource({ externalSourceId: 'Notes/note-without-title.md' }),
    );

    const result = await notes.get({ noteId: source.id });

    expect(result.title).toBe('Notes/note-without-title.md');
  });

  it('지식 폴더 밖의 source는 note로 조회되지 않는다', async () => {
    const source = await sources.insert(
      buildSource({ externalSourceId: 'Drafts/note-query-outside.md' }),
    );

    await expect(notes.get({ noteId: source.id })).rejects.toMatchObject({
      code: 'note.not_found',
    });
  });

  it('note 목록은 지식 폴더 안의 source만 담는다', async () => {
    const inside = await sources.insert(
      buildSource({ externalSourceId: 'Notes/note-query-list-inside.md' }),
    );
    const outside = await sources.insert(
      buildSource({ externalSourceId: 'Drafts/note-query-list-outside.md' }),
    );
    const lookalike = await sources.insert(
      buildSource({
        externalSourceId: 'NotesArchive/note-query-list-lookalike.md',
      }),
    );

    const { notes: listed } = await notes.paginate({
      limit: 100,
      cursor: null,
    });
    const listedIds = listed.map((note) => note.noteId);

    expect(listedIds).toContain(inside.id);
    expect(listedIds).not.toContain(outside.id);
    expect(listedIds).not.toContain(lookalike.id);
  });

  it('wiki link를 공개된 note와 post로만 풀어낸다', async () => {
    const note = await sources.insert(
      buildSource({ externalSourceId: 'Notes/note-query-link-note.md' }),
    );
    const noteWithPost = await sources.insert(
      buildSource({ externalSourceId: 'Notes/note-query-link-both.md' }),
    );
    await posts.insert(buildPost({ sourceId: noteWithPost.id }));
    const publishedDraft = await sources.insert(
      buildSource({ externalSourceId: 'Drafts/note-query-link-post.md' }),
    );
    await posts.insert(buildPost({ sourceId: publishedDraft.id }));
    await sources.insert(
      buildSource({ externalSourceId: 'Drafts/note-query-link-private.md' }),
    );
    const linking = await sources.insert(
      buildSource({
        externalSourceId: 'Notes/note-query-linking.md',
        links: [
          { target: 'note', resolvedPath: 'Notes/note-query-link-note.md' },
          { target: 'both', resolvedPath: 'Notes/note-query-link-both.md' },
          { target: 'post', resolvedPath: 'Drafts/note-query-link-post.md' },
          {
            target: 'private',
            resolvedPath: 'Drafts/note-query-link-private.md',
          },
          { target: 'not-synced', resolvedPath: 'Notes/not-synced.md' },
          { target: 'missing', resolvedPath: null },
        ],
      }),
    );

    const result = await notes.get({ noteId: linking.id });

    expect(result.links).toEqual([
      { target: 'both', noteId: noteWithPost.id, postId: noteWithPost.id },
      { target: 'missing', noteId: null, postId: null },
      { target: 'not-synced', noteId: null, postId: null },
      { target: 'note', noteId: note.id, postId: null },
      { target: 'post', noteId: null, postId: publishedDraft.id },
      { target: 'private', noteId: null, postId: null },
    ]);
  });
});
