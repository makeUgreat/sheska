import {
  type ApiRequest,
  type ApiResponse,
  errorResponseSchema,
  HealthApi,
  pathOf,
  SourceApi,
  SourceSyncJobApi,
} from '@sheska/contract';

export type HealthResponse = ApiResponse<typeof HealthApi.ready>;
export type UploadSourceRequest = ApiRequest<typeof SourceApi.upload>;
export type UploadSourceResponse = ApiResponse<typeof SourceApi.upload>;
export type SourceSyncJobResponse = ApiResponse<typeof SourceSyncJobApi.get>;

interface ResponseSchema<T> {
  parse(data: unknown): T;
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

  private async request<T>(
    path: string,
    schema: ResponseSchema<T>,
    init?: RequestInit,
  ): Promise<T> {
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

    return schema.parse(await res.json());
  }

  get<T>(path: string, schema: ResponseSchema<T>): Promise<T> {
    return this.request(path, schema);
  }

  post<T>(path: string, body: unknown, schema: ResponseSchema<T>): Promise<T> {
    return this.request(path, schema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  health(): Promise<HealthResponse> {
    return this.get(HealthApi.ready.path, HealthApi.ready.response);
  }

  uploadSource(body: UploadSourceRequest): Promise<UploadSourceResponse> {
    return this.post(SourceApi.upload.path, body, SourceApi.upload.response);
  }

  getSyncJob(syncJobId: string): Promise<SourceSyncJobResponse> {
    return this.get(
      pathOf(SourceSyncJobApi.get, { id: syncJobId }),
      SourceSyncJobApi.get.response,
    );
  }
}

function readFailureCode(body: string): string | undefined {
  try {
    const parsed = errorResponseSchema.safeParse(JSON.parse(body));
    return parsed.success ? parsed.data.code : undefined;
  } catch {
    return undefined;
  }
}
