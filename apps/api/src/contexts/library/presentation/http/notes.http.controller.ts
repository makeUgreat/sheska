import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetNoteUseCase } from '@contexts/library/application/use-cases/get-note.use-case';
import { ListNotesUseCase } from '@contexts/library/application/use-cases/list-notes.use-case';
import { encodeCursor } from '@kernels/presentation';
import {
  type GetNoteHttpResponse,
  ListNotesHttpRequest,
  type ListNotesHttpResponse,
} from './dto/notes.http.dto';

@Controller('notes')
export class NotesHttpController {
  constructor(
    private readonly listNotesUseCase: ListNotesUseCase,
    private readonly getNoteUseCase: GetNoteUseCase,
  ) {}

  @Get()
  async list(
    @Query() query: ListNotesHttpRequest,
  ): Promise<ListNotesHttpResponse> {
    const result = await this.listNotesUseCase.execute({
      cursor: query.cursor ?? null,
      limit: query.limit,
    });
    return {
      notes: result.notes.map((note) => ({
        ...note,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      })),
      nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
    };
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<GetNoteHttpResponse> {
    const note = await this.getNoteUseCase.execute({ noteId: id });
    return {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }
}
