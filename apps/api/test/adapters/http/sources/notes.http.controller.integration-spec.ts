import { type Server } from 'node:http';
import { type INestApplication } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetNoteUseCase } from '@contexts/sources/application/use-cases/get-note.use-case';
import { ListNotesUseCase } from '@contexts/sources/application/use-cases/list-notes.use-case';
import { NotesHttpController } from '@contexts/sources/presentation/http/notes.http.controller';
import { ZodValidationPipe } from '@platform/nest/pipes/zod-validation.pipe';

describe('NotesHttpController', () => {
  let app: INestApplication;
  let httpServer: Server;
  const listNotes = { execute: vi.fn<ListNotesUseCase['execute']>() };
  const getNote = { execute: vi.fn<GetNoteUseCase['execute']>() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [NotesHttpController],
      providers: [
        { provide: ListNotesUseCase, useValue: listNotes },
        { provide: GetNoteUseCase, useValue: getNote },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  afterEach(async () => app.close());

  it('GET /notes에서 note 목록을 반환한다', async () => {
    const now = new Date('2026-09-14T00:00:00.000Z');
    listNotes.execute.mockResolvedValue({
      notes: [
        {
          noteId: 'source-1',
          sourceId: 'source-1',
          title: 'Retry Amplification',
          aliases: ['Nested Retries'],
          keywords: ['retry'],
          createdAt: now,
          updatedAt: now,
        },
      ],
      nextCursor: null,
    });

    const response = await request(httpServer).get('/notes').expect(200);
    const body = response.body as { notes: unknown[] };

    expect(body.notes).toEqual([
      {
        noteId: 'source-1',
        sourceId: 'source-1',
        title: 'Retry Amplification',
        aliases: ['Nested Retries'],
        keywords: ['retry'],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ]);
  });

  it('GET /notes/:id에서 frontmatter와 body를 반환한다', async () => {
    const now = new Date('2026-09-14T00:00:00.000Z');
    getNote.execute.mockResolvedValue({
      noteId: 'source-1',
      sourceId: 'source-1',
      externalSourceId: 'Notes/retry.md',
      title: 'Retry Amplification',
      aliases: ['Nested Retries'],
      keywords: ['retry'],
      frontmatter: { custom: { status: 'draft' } },
      body: '# Retry body',
      createdAt: now,
      updatedAt: now,
    });

    const response = await request(httpServer)
      .get('/notes/source-1')
      .expect(200);

    expect(response.body).toMatchObject({
      noteId: 'source-1',
      frontmatter: { custom: { status: 'draft' } },
      body: '# Retry body',
    });
  });
});
