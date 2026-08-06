import { type HttpClientType as HttpClient } from '@/shared/api';
import {
  type CountPostsResponse,
  type GetPostResponse,
  type ListPostsParams,
  type ListPostsResponse,
  type PublishPostRequest,
  type PublishPostResponse,
  type SearchPostsParams,
  type UpdatePostRequest,
  type UpdatePostResponse,
} from './types';

export function listPosts(
  http: HttpClient,
  params?: ListPostsParams,
): Promise<ListPostsResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.cursor) queryParams.cursor = params.cursor;
  if (params?.limit) queryParams.limit = String(params.limit);

  return http.get<ListPostsResponse>(
    '/posts',
    Object.keys(queryParams).length > 0 ? queryParams : undefined,
  );
}

export function countPosts(http: HttpClient): Promise<CountPostsResponse> {
  return http.get<CountPostsResponse>('/posts/count');
}

export function searchPosts(
  http: HttpClient,
  params: SearchPostsParams,
): Promise<ListPostsResponse> {
  const queryParams: Record<string, string> = { q: params.query };
  if (params.cursor) queryParams.cursor = params.cursor;
  if (params.limit) queryParams.limit = String(params.limit);

  return http.get<ListPostsResponse>('/posts/search', queryParams);
}

export function getPost(
  http: HttpClient,
  id: string,
): Promise<GetPostResponse> {
  return http.get<GetPostResponse>(`/posts/${id}`);
}

export function publishPost(
  http: HttpClient,
  req: PublishPostRequest,
): Promise<PublishPostResponse> {
  return http.post<PublishPostResponse>('/posts', req);
}

export function updatePost(
  http: HttpClient,
  id: string,
  req: UpdatePostRequest,
): Promise<UpdatePostResponse> {
  return http.patch<UpdatePostResponse>(`/posts/${id}`, req);
}
