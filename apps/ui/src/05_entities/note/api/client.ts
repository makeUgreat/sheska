import { type HttpClientType as HttpClient } from '@/shared/api';
import {
  type GetNoteResponse,
  type ListNotesParams,
  type ListNotesResponse,
} from './types';

export function listNotes(
  http: HttpClient,
  params?: ListNotesParams,
): Promise<ListNotesResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.cursor) queryParams.cursor = params.cursor;
  if (params?.limit) queryParams.limit = String(params.limit);

  return http.get<ListNotesResponse>(
    '/notes',
    Object.keys(queryParams).length > 0 ? queryParams : undefined,
  );
}

export function getNote(
  http: HttpClient,
  id: string,
): Promise<GetNoteResponse> {
  return http.get<GetNoteResponse>(`/notes/${id}`);
}
