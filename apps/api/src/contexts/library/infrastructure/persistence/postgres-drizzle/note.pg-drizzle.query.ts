import { Inject, Injectable } from '@nestjs/common';
import { type SQL, sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { NotFoundError } from '@core/errors';
import {
  type NoteQuery,
  type NoteQueryListItem,
  type NoteQueryPaginateResult,
  type NoteQueryResult,
  type ResolvedLink,
} from '@contexts/library/application/ports';
import {
  type KnowledgeFolder,
  type SourceFrontmatterProps,
} from '@contexts/library/domain';
import { KNOWLEDGE_FOLDER } from '@contexts/library/library.di-tokens';
import {
  classifyPostgresError,
  DATABASE_TOKENS,
  sliceForCursor,
} from '@kernels/infrastructure';
import { selectResolvedLinks } from './resolved-link.pg-drizzle.sql';
import * as schema from './schema';

type NoteRow = {
  id: string;
  external_source_id: string;
  title: string;
  frontmatter: SourceFrontmatterProps;
  body: string;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class NotePgDrizzleQuery implements NoteQuery {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase<typeof schema>,
    @Inject(KNOWLEDGE_FOLDER)
    private readonly knowledgeFolder: KnowledgeFolder,
  ) {}

  async get(criteria: { noteId: string }): Promise<NoteQueryResult> {
    let row: NoteRow | undefined;
    try {
      const result = await this.db.execute<NoteRow>(sql`
        SELECT id,
          external_source_id,
          title,
          frontmatter,
          body,
          created_at,
          updated_at
        FROM sources
        WHERE id = ${criteria.noteId}
          AND ${this.isNote()}
        LIMIT 1
      `);
      row = result.rows[0];
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'note.get_failed',
        message: 'Note get query operation failed',
        details: { noteId: criteria.noteId },
        cause: error,
      });
    }

    if (!row) {
      throw new NotFoundError({
        code: 'note.not_found',
        message: 'Note not found',
        details: { noteId: criteria.noteId },
      });
    }

    return {
      ...this.toListItem(row),
      externalSourceId: row.external_source_id,
      frontmatter: row.frontmatter,
      body: row.body,
      links: await this.findLinks(row.id),
    };
  }

  async paginate(options: {
    limit: number;
    cursor: { id: string } | null;
  }): Promise<NoteQueryPaginateResult> {
    try {
      const cursorCondition = options.cursor
        ? sql`AND id < ${options.cursor.id}`
        : sql``;
      const result = await this.db.execute<NoteRow>(sql`
        SELECT id,
          external_source_id,
          title,
          frontmatter,
          body,
          created_at,
          updated_at
        FROM sources
        WHERE ${this.isNote()}
        ${cursorCondition}
        ORDER BY id DESC
        LIMIT ${options.limit + 1}
      `);
      const { data, nextCursor } = sliceForCursor(
        result.rows,
        options.limit,
        (row) => ({ id: row.id }),
      );

      return { notes: data.map((row) => this.toListItem(row)), nextCursor };
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'note.paginate_failed',
        message: 'Note paginate query operation failed',
        details: {},
        cause: error,
      });
    }
  }

  private async findLinks(noteId: string): Promise<ResolvedLink[]> {
    try {
      return await selectResolvedLinks(this.db, noteId, this.knowledgeFolder);
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'note.get_links_failed',
        message: 'Note links query operation failed',
        details: { noteId },
        cause: error,
      });
    }
  }

  private isNote(): SQL {
    return sql`starts_with(external_source_id, ${this.knowledgeFolder.pathPrefix})`;
  }

  private toListItem(row: NoteRow): NoteQueryListItem {
    return {
      noteId: row.id,
      sourceId: row.id,
      title: row.title,
      aliases: this.readStringArray(row.frontmatter.aliases),
      keywords: this.readStringArray(row.frontmatter.keywords),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
}
