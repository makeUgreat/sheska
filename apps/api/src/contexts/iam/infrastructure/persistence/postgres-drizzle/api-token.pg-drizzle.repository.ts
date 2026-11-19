import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ConstraintViolationError, NotFoundError } from '@core/errors';
import {
  type ApiToken,
  type ApiTokenRepository,
  type ApiTokenRepositoryFindCriteria,
  type ApiTokenRepositoryGetCriteria,
} from '@contexts/iam/domain';
import { classifyPostgresError, DATABASE_TOKENS } from '@kernels/infrastructure';
import * as schema from './schema';
import { ApiTokenPgDrizzleMapper } from './api-token.pg-drizzle.mapper';

@Injectable()
export class ApiTokenPgDrizzleRepository implements ApiTokenRepository {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async find(criteria: ApiTokenRepositoryFindCriteria): Promise<ApiToken | null> {
    let row: schema.ApiTokenRow | undefined;

    try {
      [row] = await this.db.select().from(schema.apiTokens).where(eq(schema.apiTokens.secretHash, criteria.secretHash)).limit(1);
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'api_token.find_failed',
        message: 'API token find operation failed',
        details: {},
        cause: error,
      });
    }

    return row === undefined ? null : ApiTokenPgDrizzleMapper.toDomain(row);
  }

  async get(criteria: ApiTokenRepositoryGetCriteria): Promise<ApiToken> {
    let row: schema.ApiTokenRow | undefined;

    try {
      [row] = await this.db.select().from(schema.apiTokens).where(eq(schema.apiTokens.id, criteria.id)).limit(1);
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'api_token.get_failed',
        message: 'API token get operation failed',
        details: { id: criteria.id },
        cause: error,
      });
    }

    if (row === undefined) throw notFound(criteria.id);
    return ApiTokenPgDrizzleMapper.toDomain(row);
  }

  async insert(apiToken: ApiToken): Promise<ApiToken> {
    const apiTokenInsert = ApiTokenPgDrizzleMapper.toInsert(apiToken);
    let row: schema.ApiTokenRow;

    try {
      [row] = await this.db.insert(schema.apiTokens).values(apiTokenInsert).returning();
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      if (ErrorClass === ConstraintViolationError) {
        throw new ConstraintViolationError({
          code: 'api_token.name_taken',
          message: 'An API token with the same name already exists',
          details: { name: apiTokenInsert.name },
        });
      }

      throw new ErrorClass({
        code: 'api_token.insert_failed',
        message: 'API token insert operation failed',
        details: { id: apiTokenInsert.id },
        cause: error,
      });
    }

    return ApiTokenPgDrizzleMapper.toDomain(row);
  }

  async update(apiToken: ApiToken): Promise<ApiToken> {
    const apiTokenInsert = ApiTokenPgDrizzleMapper.toInsert(apiToken);
    let row: schema.ApiTokenRow | undefined;

    try {
      [row] = await this.db
        .update(schema.apiTokens)
        .set({ lastUsedAt: apiTokenInsert.lastUsedAt })
        .where(eq(schema.apiTokens.id, apiTokenInsert.id))
        .returning();
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'api_token.update_failed',
        message: 'API token update operation failed',
        details: { id: apiTokenInsert.id },
        cause: error,
      });
    }

    if (row === undefined) throw notFound(apiTokenInsert.id);
    return ApiTokenPgDrizzleMapper.toDomain(row);
  }

  async delete(apiToken: ApiToken): Promise<void> {
    let row: { id: string } | undefined;

    try {
      [row] = await this.db.delete(schema.apiTokens).where(eq(schema.apiTokens.id, apiToken.id)).returning({ id: schema.apiTokens.id });
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'api_token.delete_failed',
        message: 'API token delete operation failed',
        details: { id: apiToken.id },
        cause: error,
      });
    }

    if (row === undefined) throw notFound(apiToken.id);
  }
}

function notFound(id: string): NotFoundError {
  return new NotFoundError({
    code: 'api_token.not_found',
    message: 'API token not found',
    details: { id },
  });
}
