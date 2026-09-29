import { sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type ResolvedLink } from '@contexts/library/application/ports';
import { type KnowledgeFolder } from '@contexts/library/domain';

type ResolvedLinkRow = {
  target: string;
  note_id: string | null;
  post_id: string | null;
};

export async function selectResolvedLinks(
  db: Pick<NodePgDatabase<Record<string, unknown>>, 'execute'>,
  sourceId: string,
  knowledgeFolder: KnowledgeFolder,
): Promise<ResolvedLink[]> {
  const result = await db.execute<ResolvedLinkRow>(sql`
    SELECT l.target,
      CASE WHEN starts_with(t.external_source_id, ${knowledgeFolder.pathPrefix})
        THEN t.id END AS note_id,
      p.id AS post_id
    FROM source_links l
    LEFT JOIN sources t ON t.external_source_id = l.resolved_path
    LEFT JOIN posts p ON p.id = t.id
    WHERE l.source_id = ${sourceId}
    ORDER BY l.target COLLATE "C"
  `);
  return result.rows.map((row) => ({
    target: row.target,
    noteId: row.note_id,
    postId: row.post_id,
  }));
}
