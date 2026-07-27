import { type HttpClient } from '@/shared/api/http';
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
