import { Inject, Injectable } from '@nestjs/common';
import {
  type SourceQuery,
  type SourceQueryCursor,
  type SourceQueryPaginateResult,
} from '@contexts/sources/application/ports';
import { SOURCE_QUERY } from '@contexts/sources/sources.di-tokens';

export interface ListSourcesCommand {
  readonly cursor?: SourceQueryCursor;
  readonly limit?: number;
}

@Injectable()
export class ListSourcesUseCase {
  constructor(
    @Inject(SOURCE_QUERY)
    private readonly sourceQuery: SourceQuery,
  ) {}

  async execute(
    command: ListSourcesCommand = {},
  ): Promise<SourceQueryPaginateResult> {
    return this.sourceQuery.paginate({
      cursor: command.cursor,
      limit: command.limit,
    });
  }
}
