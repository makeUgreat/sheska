import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type NoteQuery } from '@contexts/library/application/ports';
import { type SourceRepository } from '@contexts/library/domain';
import {
  NOTE_QUERY,
  SOURCE_REPOSITORY,
} from '@contexts/library/library.di-tokens';
import { AppModule } from '@platform/nest/app.module';
import { buildSource } from '../../../support/domains/fixtures/source.fixture';

describe('NotePgDrizzleQuery', () => {
  let app: INestApplication;
  let notes: NoteQuery;
  let sources: SourceRepository;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    notes = app.get<NoteQuery>(NOTE_QUERY);
    sources = app.get<SourceRepository>(SOURCE_REPOSITORY);
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
});
