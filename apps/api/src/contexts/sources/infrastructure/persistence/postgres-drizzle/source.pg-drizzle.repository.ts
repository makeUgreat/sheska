import { desc, eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  type Source,
  type SourceRepository,
  type SourceRepositoryFindCriteria,
  type SourceRepositoryGetCriteria,
} from '@contexts/sources/domain';
import {
  classifyPostgresError,
  InfrastructureException,
} from '@kernels/infrastructure';
import * as schema from './schema';
import { SourcePgDrizzleMapper } from './source.pg-drizzle.mapper';

const ADAPTER = 'source.pg-drizzle';

export class SourcePgDrizzleRepository implements SourceRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async find(criteria: SourceRepositoryFindCriteria): Promise<Source | null> {
    let row: schema.SourceRow | undefined;

    try {
      [row] = await this.db
        .select()
        .from(schema.sources)
        .where(eq(schema.sources.externalSourceId, criteria.externalSourceId))
        .limit(1);
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source.find_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source find operation failed',
        details: { cause: error },
      });
    }

    if (row === undefined) {
      return null;
    }

    return SourcePgDrizzleMapper.toDomain(row);
  }

  async get(criteria: SourceRepositoryGetCriteria): Promise<Source | null> {
    let row: schema.SourceRow | undefined;

    try {
      [row] = await this.db
        .select()
        .from(schema.sources)
        .where(eq(schema.sources.id, criteria.id))
        .limit(1);
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source.get_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source get operation failed',
        details: { cause: error },
      });
    }

    if (row === undefined) {
      return null;
    }

    return SourcePgDrizzleMapper.toDomain(row);
  }

  async list(): Promise<Source[]> {
    let rows: schema.SourceRow[];

    try {
      rows = await this.db
        .select()
        .from(schema.sources)
        .orderBy(desc(schema.sources.createdAt));
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source.list_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source list operation failed',
        details: { cause: error },
      });
    }

    return rows.map((row) => SourcePgDrizzleMapper.toDomain(row));
  }

  async save(source: Source): Promise<Source> {
    const sourceInsert = SourcePgDrizzleMapper.toInsert(source);
    let row: schema.SourceRow;

    try {
      [row] = await this.db
        .insert(schema.sources)
        .values(sourceInsert)
        .onConflictDoUpdate({
          target: schema.sources.id,
          set: {
            externalSourceId: sourceInsert.externalSourceId,
            content: sourceInsert.content,
            fingerprint: sourceInsert.fingerprint,
            sizeBytes: sourceInsert.sizeBytes,
            updatedAt: new Date(),
          },
        })
        .returning();
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source.save_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source save operation failed',
        details: { cause: error },
      });
    }

    return SourcePgDrizzleMapper.toDomain(row);
  }
}
