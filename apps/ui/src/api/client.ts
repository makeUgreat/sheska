// API contract types mirrored from apps/api

export interface SyncJobSummary {
  syncJobId: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface SourceSummary {
  sourceId: string;
  externalSourceId: string;
  fingerprint: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  latestSyncJob: SyncJobSummary | null;
}

export interface ListSourcesResponse {
  sources: SourceSummary[];
}

export interface EmbeddingInfo {
  model: string;
  dimensions: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostSummary {
  postId: string;
  sourceId: string;
  title: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListPostsResponse {
  posts: PostSummary[];
}

export interface PublishPostRequest {
  sourceId: string;
}

export interface PublishPostResponse {
  postId: string;
  sourceId: string;
  title: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetPostResponse {
  postId: string;
  sourceId: string;
  title: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  sourceContent: string;
}

export interface UpdatePostRequest {
  title: string;
}

export interface UpdatePostResponse {
  postId: string;
  sourceId: string;
  title: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetSourceResponse {
  sourceId: string;
  externalSourceId: string;
  content: string;
  fingerprint: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  latestSyncJob: SyncJobSummary | null;
  embedding: EmbeddingInfo | null;
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

  listPosts(): Promise<ListPostsResponse> {
    return this.http.get<ListPostsResponse>('/posts');
  }

  searchPosts(query: string): Promise<ListPostsResponse> {
    return this.http.get<ListPostsResponse>('/posts/search', { q: query });
  }

  getPost(id: string): Promise<GetPostResponse> {
    return this.http.get<GetPostResponse>(`/posts/${id}`);
  }

  publishPost(req: PublishPostRequest): Promise<PublishPostResponse> {
    return this.http.post<PublishPostResponse>('/posts', req);
  }

  updatePost(id: string, req: UpdatePostRequest): Promise<UpdatePostResponse> {
    return this.http.patch<UpdatePostResponse>(`/posts/${id}`, req);
  }
}
