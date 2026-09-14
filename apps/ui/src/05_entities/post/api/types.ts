export interface PostSummary {
  postId: string;
  sourceId: string;
  title: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  similarity?: number | null;
  snippet?: string | null;
}

export interface ListPostsParams {
  cursor?: string;
  limit?: number;
}

export interface SearchPostsParams extends ListPostsParams {
  query: string;
}

export interface ListPostsResponse {
  posts: PostSummary[];
  nextCursor: string | null;
}

export interface SearchPostsResponse extends ListPostsResponse {
  semanticSearchApplied: boolean;
}

export interface CountPostsResponse {
  count: number;
}

export interface PublishPostRequest {
  sourceId: string;
}

export interface PublishPostResponse {
  postId: string;
  sourceId: string;
  title: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetPostResponse {
  postId: string;
  sourceId: string;
  title: string;
  body: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}
