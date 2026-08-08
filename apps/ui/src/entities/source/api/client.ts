import { type HttpClientType as HttpClient } from '@/shared/api';
import { type GetSourceResponse, type ListSourcesResponse } from './types';

export function listSources(http: HttpClient): Promise<ListSourcesResponse> {
  return http.get<ListSourcesResponse>('/sources');
}

export function getSource(
  http: HttpClient,
  id: string,
): Promise<GetSourceResponse> {
  return http.get<GetSourceResponse>(`/sources/${id}`);
}
