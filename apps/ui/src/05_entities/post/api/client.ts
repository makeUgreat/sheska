import { pathOf, PostApi } from '@sheska/contract';
import { type HttpClientType as HttpClient } from '@/shared/api';
import {
  type CountPostsResponse,
  type GetPostResponse,
  type ListPostsParams,
  type ListPostsResponse,
  type PublishPostRequest,
  type PublishPostResponse,
  type SearchPostsParams,
  type SearchPostsResponse,
} from './types';

export function listPosts(
  http: HttpClient,
  params?: ListPostsParams,
): Promise<ListPostsResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.cursor) queryParams.cursor = params.cursor;
  if (params?.limit) queryParams.limit = String(params.limit);

  return http.get(
    PostApi.list.path,
    PostApi.list.response,
    Object.keys(queryParams).length > 0 ? queryParams : undefined,
  );
}

export function countPosts(http: HttpClient): Promise<CountPostsResponse> {
  return http.get(PostApi.count.path, PostApi.count.response);
}

export function searchPosts(
  http: HttpClient,
  params: SearchPostsParams,
): Promise<SearchPostsResponse> {
  const queryParams: Record<string, string> = { q: params.query };
  if (params.cursor) queryParams.cursor = params.cursor;
  if (params.limit) queryParams.limit = String(params.limit);

  return http.get(PostApi.search.path, PostApi.search.response, queryParams);
}

export function getPost(
  http: HttpClient,
  id: string,
): Promise<GetPostResponse> {
  return http.get(pathOf(PostApi.get, { id }), PostApi.get.response);
}

export function publishPost(
  http: HttpClient,
  req: PublishPostRequest,
): Promise<PublishPostResponse> {
  return http.post(PostApi.publish.path, req, PostApi.publish.response);
}
