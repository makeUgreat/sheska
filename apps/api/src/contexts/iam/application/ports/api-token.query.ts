import { type Permission } from '@contexts/iam/domain';

export interface ApiTokenQueryListItem {
  readonly apiTokenId: string;
  readonly name: string;
  readonly hint: string;
  readonly permissions: ReadonlyArray<Permission>;
  readonly createdAt: Date;
  readonly lastUsedAt: Date | null;
}

export interface ApiTokenQuery {
  list(): Promise<ReadonlyArray<ApiTokenQueryListItem>>;
}
