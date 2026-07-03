// API contract types mirrored from apps/api

export interface SourceSummary {
  sourceId: string;
  externalSourceId: string;
  fingerprint: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListSourcesResponse {
  sources: SourceSummary[];
}

export interface GetSourceResponse {
  sourceId: string;
  externalSourceId: string;
  content: string;
  fingerprint: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

import { type HttpClient } from './http';

export class SheskaApiClient {
  constructor(private readonly http: HttpClient) {}

  listSources(): Promise<ListSourcesResponse> {
    return this.http.get<ListSourcesResponse>('/sources');
  }

  getSource(id: string): Promise<GetSourceResponse> {
    return this.http.get<GetSourceResponse>(`/sources/${id}`);
  }
}
