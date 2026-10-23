import {
  type ApiQuery,
  type ApiRequest,
  type ApiResponse,
  type PostApi,
  type PostResponse,
  type PostSearchResultResponse,
  type PostSummaryResponse,
} from '@sheska/contract';

export type PostSummary = PostSummaryResponse &
  Partial<Pick<PostSearchResultResponse, 'similarity' | 'snippet'>>;

export type ListPostsParams = ApiQuery<typeof PostApi.list>;

export interface SearchPostsParams extends ListPostsParams {
  query: string;
}

export type ListPostsResponse = ApiResponse<typeof PostApi.list>;
export type SearchPostsResponse = ApiResponse<typeof PostApi.search>;
export type CountPostsResponse = ApiResponse<typeof PostApi.count>;
export type PublishPostRequest = ApiRequest<typeof PostApi.publish>;
export type PublishPostResponse = ApiResponse<typeof PostApi.publish>;
export type GetPostResponse = PostResponse;
