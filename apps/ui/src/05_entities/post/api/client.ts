import { pathOf, PostApi, PostSchema } from '@sheska/contract';
import { type HttpClientType as HttpClient } from '@/shared/api';
import {
  type AnswerEvent,
  type AskPostRequest,
  type CountPostsResponse,
  type GetPostResponse,
  type ListPostsParams,
  type ListPostViewsParams,
  type ListPostViewsResponse,
  type ListPostsResponse,
  type PublishPostRequest,
  type PublishPostResponse,
  type SearchPostsParams,
  type SearchPostsResponse,
} from './types';

export function listPosts(http: HttpClient, params?: ListPostsParams): Promise<ListPostsResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.cursor) queryParams.cursor = params.cursor;
  if (params?.limit) queryParams.limit = String(params.limit);
  if (params?.project) queryParams.project = params.project;

  return http.get(PostApi.list.path, PostApi.list.response, Object.keys(queryParams).length > 0 ? queryParams : undefined);
}

export function countPosts(http: HttpClient): Promise<CountPostsResponse> {
  return http.get(PostApi.count.path, PostApi.count.response);
}

export function searchPosts(http: HttpClient, params: SearchPostsParams): Promise<SearchPostsResponse> {
  const queryParams: Record<string, string> = { q: params.query };
  if (params.cursor) queryParams.cursor = params.cursor;
  if (params.limit) queryParams.limit = String(params.limit);

  return http.get(PostApi.search.path, PostApi.search.response, queryParams);
}

export function getPost(http: HttpClient, id: string): Promise<GetPostResponse> {
  return http.get(pathOf(PostApi.get, { id }), PostApi.get.response);
}

export function listPostViews(http: HttpClient, id: string, params?: ListPostViewsParams): Promise<ListPostViewsResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.cursor) queryParams.cursor = params.cursor;
  if (params?.limit) queryParams.limit = String(params.limit);

  return http.get(
    pathOf(PostApi.listViews, { id }),
    PostApi.listViews.response,
    Object.keys(queryParams).length > 0 ? queryParams : undefined,
  );
}

export function recordPostView(http: HttpClient, id: string): Promise<void> {
  return http.post(pathOf(PostApi.recordView, { id }), {});
}

export function publishPost(http: HttpClient, req: PublishPostRequest): Promise<PublishPostResponse> {
  return http.post(PostApi.publish.path, req, PostApi.publish.response);
}

export function unpublishPost(http: HttpClient, id: string): Promise<void> {
  return http.delete(pathOf(PostApi.unpublish, { id }));
}

export function askAboutPost(http: HttpClient, id: string, req: AskPostRequest, signal?: AbortSignal): AsyncGenerator<AnswerEvent> {
  return http.postStream(pathOf(PostApi.ask, { id }), req, PostSchema.answerEvent, signal);
}
