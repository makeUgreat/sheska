export interface PostQueryResult {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly viewCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly sourceContent: string;
}

export type PostQueryFindCriteria = {
  readonly id: string;
};

export type PostQueryCursor = {
  readonly createdAt: Date;
  readonly id: string;
  readonly score?: number;
};

export type PostQueryPaginateOptions = {
  readonly limit?: number;
  readonly cursor?: PostQueryCursor;
};

export type PostQuerySearchOptions = {
  readonly query: string;
  readonly limit?: number;
  readonly cursor?: PostQueryCursor;
};

export type PostQueryListItem = {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly viewCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type PostQueryPaginateResult = {
  readonly posts: ReadonlyArray<PostQueryListItem>;
  readonly nextCursor: PostQueryCursor | null;
};

export interface PostQuery {
  get(criteria: PostQueryFindCriteria): Promise<PostQueryResult>;
  find(criteria: PostQueryFindCriteria): Promise<PostQueryResult | null>;
  paginate(
    options?: PostQueryPaginateOptions,
  ): Promise<PostQueryPaginateResult>;
  search(options: PostQuerySearchOptions): Promise<PostQueryPaginateResult>;
}
