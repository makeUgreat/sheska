import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ConstraintViolationError, NotFoundError } from '@core/errors';
import {
  type Source,
  type SourceRepository,
  type SourceRepositoryFindCriteria,
  type SourceRepositoryGetCriteria,
} from '@contexts/library/domain';
import {
  classifyPostgresError,
  DATABASE_TOKENS,
  type PgDrizzleSession,
} from '@kernels/infrastructure';
import * as schema from './schema';
import { SourcePgDrizzleMapper } from './source.pg-drizzle.mapper';

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
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'source.find_failed',
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
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'source.get_failed',
        message: 'Source get operation failed',
        details: { id: criteria.id },
        cause: error,
      });
    }

    if (row === undefined) {
      throw new NotFoundError({
        code: 'source.not_found',
        message: 'Source not found',
        details: { id: criteria.id },
      });
    }

    return SourcePgDrizzleMapper.toDomain(row);
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
      const ErrorClass = classifyPostgresError(error);
      if (ErrorClass === ConstraintViolationError) {
        throw new ConstraintViolationError({
          code: 'source.external_source_id_already_exists',
          message: 'A source with the same external source id already exists',
          details: { externalSourceId: sourceInsert.externalSourceId },
        });
      }

      throw new ErrorClass({
        code: 'source.insert_failed',
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
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'source.update_failed',
        message: 'Source update operation failed',
        details: { id: sourceInsert.id },
        cause: error,
      });
    }

    if (row === undefined) {
      throw new NotFoundError({
        code: 'source.not_found',
        message: 'Source not found',
        details: { id: sourceInsert.id },
      });
    }

    return SourcePgDrizzleMapper.toDomain(row);
  }
}
