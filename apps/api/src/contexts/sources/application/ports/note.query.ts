import { type SourceFrontmatterProps } from '@contexts/sources/domain';

export type NoteQueryCursor = { readonly id: string };

export interface NoteQueryListItem {
  readonly noteId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly aliases: readonly string[];
  readonly keywords: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface NoteQueryResult extends NoteQueryListItem {
  readonly externalSourceId: string;
  readonly frontmatter: SourceFrontmatterProps;
  readonly body: string;
}

export interface NoteQueryPaginateResult {
  readonly notes: readonly NoteQueryListItem[];
  readonly nextCursor: NoteQueryCursor | null;
}

export interface NoteQuery {
  get(criteria: { noteId: string }): Promise<NoteQueryResult>;
  paginate(options: {
    limit: number;
    cursor: NoteQueryCursor | null;
  }): Promise<NoteQueryPaginateResult>;
}
