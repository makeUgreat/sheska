// API contract types mirrored from apps/api

export interface HealthResponse {
  status: string;
}

export interface UploadSourceRequest {
  externalSourceId: string;
  content: string;
}

export interface UploadSourceResponse {
  sourceId: string;
  externalSourceId: string;
  fingerprint: string;
  syncJobId?: string;
}

export class SheskaApiClient {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (!res.ok) {
      throw new Error(`Sheska API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  health(): Promise<HealthResponse> {
    return this.get<HealthResponse>('/readyz');
  }

  uploadSource(body: UploadSourceRequest): Promise<UploadSourceResponse> {
    return this.post<UploadSourceResponse>('/sources', body);
  }
}
