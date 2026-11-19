import { Inject, Injectable } from '@nestjs/common';
import {
  type ApiTokenQuery,
  type ApiTokenQueryListItem,
} from '@contexts/iam/application/ports';
import { API_TOKEN_QUERY } from '@contexts/iam/iam.di-tokens';

@Injectable()
export class ListApiTokensUseCase {
  constructor(
    @Inject(API_TOKEN_QUERY)
    private readonly apiTokenQuery: ApiTokenQuery,
  ) {}

  async execute(): Promise<ReadonlyArray<ApiTokenQueryListItem>> {
    return this.apiTokenQuery.list();
  }
}
