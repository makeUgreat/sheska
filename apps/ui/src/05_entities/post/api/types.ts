import {
  type ApiQuery,
  type ApiRequest,
  type ApiResponse,
  type ApiStreamEvent,
  type PostAiSummaryResponse,
  type PostApi,
  type PostResponse,
  type PostSearchResultResponse,
  type PostSeriesResponse,
  type PostSummaryResponse,
  type PostViewResponse,
} from '@sheska/contract';

export type PostSeries = PostSeriesResponse;

export type PostSummary = PostSummaryResponse & {
  series?: PostSeries | null;
} & Partial<Pick<PostSearchResultResponse, 'similarity' | 'snippet'>>;

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
export type AiSummary = PostAiSummaryResponse;
export type AskPostRequest = ApiRequest<typeof PostApi.ask>;
export type AnswerEvent = ApiStreamEvent<typeof PostApi.ask>;
export type PostView = PostViewResponse;
export type ListPostViewsParams = ApiQuery<typeof PostApi.listViews>;
export type ListPostViewsResponse = ApiResponse<typeof PostApi.listViews>;
