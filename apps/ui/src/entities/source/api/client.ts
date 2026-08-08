import { type HttpClientType as HttpClient } from '@/shared/api';
import {
  type GetSourceResponse,
  type ListSourcesParams,
  type ListSourcesResponse,
} from './types';

export function listSources(
  http: HttpClient,
  params?: ListSourcesParams,
): Promise<ListSourcesResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.cursor) queryParams.cursor = params.cursor;
  if (params?.limit) queryParams.limit = String(params.limit);

  return http.get<ListSourcesResponse>(
    '/sources',
    Object.keys(queryParams).length > 0 ? queryParams : undefined,
  );
}

export function getSource(
  http: HttpClient,
  id: string,
): Promise<GetSourceResponse> {
  return http.get<GetSourceResponse>(`/sources/${id}`);
}
