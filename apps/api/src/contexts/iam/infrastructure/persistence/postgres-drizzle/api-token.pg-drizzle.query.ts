import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type ApiTokenQuery, type ApiTokenQueryListItem } from '@contexts/iam/application/ports';
import { classifyPostgresError, DATABASE_TOKENS } from '@kernels/infrastructure';
import * as schema from './schema';

@Injectable()
export class ApiTokenPgDrizzleQuery implements ApiTokenQuery {
  constructor(
    @Inject(DATABASE_TOKENS.drizzleDatabase)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async list(): Promise<ReadonlyArray<ApiTokenQueryListItem>> {
    try {
      return await this.db
        .select({
          apiTokenId: schema.apiTokens.id,
          name: schema.apiTokens.name,
          hint: schema.apiTokens.hint,
          permissions: schema.apiTokens.permissions,
          createdAt: schema.apiTokens.createdAt,
          lastUsedAt: schema.apiTokens.lastUsedAt,
        })
        .from(schema.apiTokens)
        .orderBy(asc(schema.apiTokens.createdAt), asc(schema.apiTokens.id));
    } catch (error: unknown) {
      const ErrorClass = classifyPostgresError(error);
      throw new ErrorClass({
        code: 'api_token.list_failed',
        message: 'API token list operation failed',
        details: {},
        cause: error,
      });
    }
  }
}
