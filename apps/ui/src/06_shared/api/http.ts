export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, statusText: string, code?: string) {
    super(`HTTP error: ${status} ${statusText}`);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

const RETRYABLE_STATUS = 429;

export function isRetryableHttpError(error: unknown): boolean {
  if (!(error instanceof HttpError)) return true;
  return error.status === RETRYABLE_STATUS || error.status >= 500;
}

export class HttpClient {
  constructor(private readonly baseUrl: string) {}

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const search = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<T>(`${path}${search}`);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      throw new HttpError(
        res.status,
        res.statusText,
        await readFailureCode(res),
      );
    }

    return res.json() as Promise<T>;
  }
}

async function readFailureCode(res: Response): Promise<string | undefined> {
  try {
    const body: unknown = JSON.parse(await res.text());
    if (typeof body !== 'object' || body === null) return undefined;
    const { code } = body as { code?: unknown };
    return typeof code === 'string' ? code : undefined;
  } catch {
    return undefined;
  }
}
