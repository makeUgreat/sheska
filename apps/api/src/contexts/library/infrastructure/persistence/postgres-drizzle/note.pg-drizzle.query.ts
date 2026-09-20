import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type NoteQuery,
  type NoteQueryListItem,
  type NoteQueryPaginateResult,
  type NoteQueryResult,
} from '@contexts/library/application/ports';
import { type SourceFrontmatterProps } from '@contexts/library/domain';
import {
  classifyPostgresError,
  DATABASE_TOKENS,
  INFRASTRUCTURE_ERROR_KIND,
  InfrastructureException,
  sliceForCursor,
} from '@kernels/infrastructure';
import * as schema from './schema';

const ADAPTER = 'note.pg-drizzle';

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
        LIMIT 1
      `);
      row = result.rows[0];
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'note.get_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Note get query operation failed',
        details: { noteId: criteria.noteId },
        cause: error,
      });
    }

    if (!row) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.NOT_FOUND,
        code: 'note.not_found',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Note not found',
        details: { noteId: criteria.noteId },
      });
    }

    return {
      ...this.toListItem(row),
      externalSourceId: row.external_source_id,
      frontmatter: row.frontmatter,
      body: row.body,
    };
  }

  async paginate(options: {
    limit: number;
    cursor: { id: string } | null;
  }): Promise<NoteQueryPaginateResult> {
    try {
      const cursorCondition = options.cursor
        ? sql`WHERE id < ${options.cursor.id}`
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
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'note.paginate_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Note paginate query operation failed',
        details: {},
        cause: error,
      });
    }
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
