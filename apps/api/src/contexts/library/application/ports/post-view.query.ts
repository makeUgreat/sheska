export type PostViewQueryCursor = {
  readonly id: string;
};

export type PostViewQueryPaginateOptions = {
  readonly postId: string;
  readonly limit: number;
  readonly cursor: PostViewQueryCursor | null;
};

export type PostViewQueryListItem = {
  readonly viewedAt: Date;
  readonly ip: string;
  readonly client: string;
};

export type PostViewQueryPaginateResult = {
  readonly views: ReadonlyArray<PostViewQueryListItem>;
  readonly nextCursor: PostViewQueryCursor | null;
};

export interface PostViewQuery {
  /** 최신순으로 읽는다. 같은 시각이면 나중에 넣은 기록이 먼저다. */
  paginate(options: PostViewQueryPaginateOptions): Promise<PostViewQueryPaginateResult>;
}
