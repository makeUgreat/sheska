export interface ApiTokenQueryListItem {
  readonly apiTokenId: string;
  readonly name: string;
  readonly hint: string;
  readonly createdAt: Date;
  readonly lastUsedAt: Date | null;
}

export interface ApiTokenQuery {
  list(): Promise<ReadonlyArray<ApiTokenQueryListItem>>;
}
