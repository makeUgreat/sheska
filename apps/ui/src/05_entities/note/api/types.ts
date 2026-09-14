export interface NoteSummary {
  noteId: string;
  sourceId: string;
  title: string;
  aliases: string[];
  keywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ListNotesParams {
  cursor?: string;
  limit?: number;
}

export interface ListNotesResponse {
  notes: NoteSummary[];
  nextCursor: string | null;
}

export interface GetNoteResponse extends NoteSummary {
  externalSourceId: string;
  frontmatter: Record<string, unknown>;
  body: string;
}
