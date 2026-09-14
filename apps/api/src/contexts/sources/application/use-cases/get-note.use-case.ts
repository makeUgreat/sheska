import { Inject, Injectable } from '@nestjs/common';
import {
  type NoteQuery,
  type NoteQueryResult,
} from '@contexts/sources/application/ports';
import { NOTE_QUERY } from '@contexts/sources/sources.di-tokens';

@Injectable()
export class GetNoteUseCase {
  constructor(@Inject(NOTE_QUERY) private readonly notes: NoteQuery) {}

  execute(command: { noteId: string }): Promise<NoteQueryResult> {
    return this.notes.get(command);
  }
}
