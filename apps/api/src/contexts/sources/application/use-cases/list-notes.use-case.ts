import { Inject, Injectable } from '@nestjs/common';
import {
  type NoteQuery,
  type NoteQueryCursor,
  type NoteQueryPaginateResult,
} from '@contexts/sources/application/ports';
import { NOTE_QUERY } from '@contexts/sources/sources.di-tokens';

export interface ListNotesCommand {
  readonly cursor: NoteQueryCursor | null;
  readonly limit: number;
}

@Injectable()
export class ListNotesUseCase {
  constructor(@Inject(NOTE_QUERY) private readonly notes: NoteQuery) {}

  execute(command: ListNotesCommand): Promise<NoteQueryPaginateResult> {
    return this.notes.paginate(command);
  }
}
