import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import {
  type Source,
  type SourceRepository,
  type SourceRepositoryFindCriteria,
  type SourceRepositoryGetCriteria,
} from '@contexts/library/domain';
import {
  classifyPostgresError,
  DATABASE_TOKENS,
  INFRASTRUCTURE_ERROR_KIND,
  InfrastructureException,
  type PgDrizzleSession,
} from '@kernels/infrastructure';
import * as schema from './schema';
import { SourcePgDrizzleMapper } from './source.pg-drizzle.mapper';

const ADAPTER = 'source.pg-drizzle';

@Injectable()
export class SourcePgDrizzleRepository implements SourceRepository {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: PgDrizzleSession<typeof schema>,
  ) {}

  async find(criteria: SourceRepositoryFindCriteria): Promise<Source | null> {
    let row: schema.SourceRow | undefined;

    try {
      const condition =
        'id' in criteria
          ? eq(schema.sources.id, criteria.id)
          : eq(schema.sources.externalSourceId, criteria.externalSourceId);
      [row] = await this.db
        .select()
        .from(schema.sources)
        .where(condition)
        .limit(1);
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source.find_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source find operation failed',
        details: criteria,
        cause: error,
      });
    }

    if (row === undefined) {
      return null;
    }

    return SourcePgDrizzleMapper.toDomain(row);
  }

  async get(criteria: SourceRepositoryGetCriteria): Promise<Source> {
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
        details: { id: criteria.id },
        cause: error,
      });
    }

    if (row === undefined) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.NOT_FOUND,
        code: 'source.not_found',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source not found',
        details: { id: criteria.id },
      });
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
        details: {},
        cause: error,
      });
    }

    return rows.map((row) => SourcePgDrizzleMapper.toDomain(row));
  }

  async insert(source: Source): Promise<Source> {
    const sourceInsert = SourcePgDrizzleMapper.toInsert(source);
    let row: schema.SourceRow;

    try {
      [row] = await this.db
        .insert(schema.sources)
        .values(sourceInsert)
        .returning();
    } catch (error: unknown) {
      const kind = classifyPostgresError(error);
      if (kind === INFRASTRUCTURE_ERROR_KIND.CONSTRAINT_VIOLATION) {
        throw new InfrastructureException({
          kind,
          code: 'source.external_source_id_already_exists',
          source: { boundary: 'persistence', adapter: ADAPTER },
          message: 'A source with the same external source id already exists',
          details: { externalSourceId: sourceInsert.externalSourceId },
        });
      }

      throw new InfrastructureException({
        kind,
        code: 'source.insert_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source insert operation failed',
        details: { id: sourceInsert.id },
        cause: error,
      });
    }

    return SourcePgDrizzleMapper.toDomain(row);
  }

  async update(source: Source): Promise<Source> {
    const sourceInsert = SourcePgDrizzleMapper.toInsert(source);
    let row: schema.SourceRow | undefined;

    try {
      [row] = await this.db
        .update(schema.sources)
        .set({
          externalSourceId: sourceInsert.externalSourceId,
          frontmatter: sourceInsert.frontmatter,
          title: sourceInsert.title,
          body: sourceInsert.body,
          fingerprint: sourceInsert.fingerprint,
          sizeBytes: sourceInsert.sizeBytes,
          updatedAt: new Date(),
        })
        .where(eq(schema.sources.id, sourceInsert.id))
        .returning();
    } catch (error: unknown) {
      throw new InfrastructureException({
        kind: classifyPostgresError(error),
        code: 'source.update_failed',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source update operation failed',
        details: { id: sourceInsert.id },
        cause: error,
      });
    }

    if (row === undefined) {
      throw new InfrastructureException({
        kind: INFRASTRUCTURE_ERROR_KIND.NOT_FOUND,
        code: 'source.not_found',
        source: { boundary: 'persistence', adapter: ADAPTER },
        message: 'Source not found',
        details: { id: sourceInsert.id },
      });
    }

    return SourcePgDrizzleMapper.toDomain(row);
  }
}
