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

export type SourceSyncJobStatus =
  | 'waiting'
  | 'processing'
  | 'completed'
  | 'failed';

export interface SourceSyncJobResponse {
  syncJobId: string;
  sourceId: string;
  fingerprint: string;
  status: SourceSyncJobStatus;
  totalChunks: number | null;
  processedChunks: number | null;
  createdAt: string;
}

export class SheskaApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, statusText: string, body: string, code?: string) {
    super(
      `Sheska API error: ${status} ${statusText}${body ? ` — ${body}` : ''}`,
    );
    this.name = 'SheskaApiError';
    this.status = status;
    this.code = code;
  }
}

const RETRYABLE_STATUS = 429;

export function isRetryableApiError(error: unknown): boolean {
  if (!(error instanceof SheskaApiError)) return true;
  return error.status === RETRYABLE_STATUS || error.status >= 500;
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
      const body = await res.text().catch(() => '');
      throw new SheskaApiError(
        res.status,
        res.statusText,
        body,
        readFailureCode(body),
      );
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

  getSyncJob(syncJobId: string): Promise<SourceSyncJobResponse> {
    return this.get<SourceSyncJobResponse>(
      `/sync-jobs/${encodeURIComponent(syncJobId)}`,
    );
  }
}

function readFailureCode(body: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const { code } = parsed as { code?: unknown };
    return typeof code === 'string' ? code : undefined;
  } catch {
    return undefined;
  }
}
