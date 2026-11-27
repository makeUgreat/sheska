import { type PostSummaryOutcome } from '@contexts/library/domain';

export type PostQuerySummary = { readonly kind: 'pending' } | PostSummaryOutcome;

export type PostQuerySeries = {
  readonly name: string;
  readonly position: number;
  readonly total: number;
};

export type PostQuerySeriesPost = {
  readonly postId: string;
  readonly title: string;
};

export type PostQuerySeriesWithPosts = PostQuerySeries & {
  readonly posts: ReadonlyArray<PostQuerySeriesPost>;
};

export interface PostQueryResult {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly body: string;
  readonly viewCount: number;
  readonly summary: PostQuerySummary;
  readonly series: PostQuerySeriesWithPosts | null;
  readonly project: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type PostQueryFindCriteria = {
  readonly id: string;
};

export type PostQueryCursor = {
  readonly id: string;
};

export type PostQuerySearchCursor = PostQueryCursor & {
  readonly score: number;
};

export type PostQueryPaginateOptions = {
  readonly limit: number;
  readonly cursor: PostQueryCursor | null;
  /** 정규화한 관련 프로젝트 이름. `null`이면 모든 post다. */
  readonly project: string | null;
};

export type PostQuerySearchOptions = {
  readonly query: string;
  readonly limit: number;
  readonly cursor: PostQuerySearchCursor | null;
  readonly queryEmbedding: number[] | null;
};

export type PostQueryListItem = {
  readonly postId: string;
  readonly sourceId: string;
  readonly title: string;
  readonly viewCount: number;
  readonly summary: PostQuerySummary;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type PostQueryPageItem = PostQueryListItem & {
  readonly series: PostQuerySeries | null;
  readonly project: string | null;
};

export type PostMatchReason = 'keyword' | 'semantic' | 'both';

export type PostQuerySearchResultItem = PostQueryListItem & {
  readonly matchReason: PostMatchReason;
  readonly similarity: number | null;
  readonly snippet: string | null;
};

export type PostQueryPaginateResult = {
  readonly posts: ReadonlyArray<PostQueryPageItem>;
  readonly nextCursor: PostQueryCursor | null;
};

export type PostQuerySearchResult = {
  readonly posts: ReadonlyArray<PostQuerySearchResultItem>;
  readonly nextCursor: PostQuerySearchCursor | null;
};

export interface PostQuery {
  get(criteria: PostQueryFindCriteria): Promise<PostQueryResult>;
  find(criteria: PostQueryFindCriteria): Promise<PostQueryResult | null>;
  paginate(options: PostQueryPaginateOptions): Promise<PostQueryPaginateResult>;
  search(options: PostQuerySearchOptions): Promise<PostQuerySearchResult>;
  count(): Promise<number>;
}
