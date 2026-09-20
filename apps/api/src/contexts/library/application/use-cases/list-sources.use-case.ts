import { Inject, Injectable } from '@nestjs/common';
import {
  type SourceQuery,
  type SourceQueryPaginateResult,
} from '@contexts/library/application/ports';
import { SOURCE_QUERY } from '@contexts/library/library.di-tokens';

export interface ListSourcesCommand {
  readonly page: number;
  readonly pageSize: number;
  readonly syncJobStatus?: 'waiting' | 'completed' | 'failed';
}

@Injectable()
export class ListSourcesUseCase {
  constructor(
    @Inject(SOURCE_QUERY)
    private readonly sourceQuery: SourceQuery,
  ) {}

  async execute(
    command: ListSourcesCommand,
  ): Promise<SourceQueryPaginateResult> {
    return this.sourceQuery.paginate({
      page: command.page,
      pageSize: command.pageSize,
      syncJobStatus: command.syncJobStatus,
    });
  }
}
