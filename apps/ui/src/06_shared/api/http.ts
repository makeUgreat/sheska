import { errorResponseSchema } from '@sheska/contract';

/** 계약의 schema처럼 응답 본문을 검증하고 타입을 붙이는 것 */
export interface ResponseSchema<T> {
  parse(data: unknown): T;
}

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
  if (error instanceof TypeError) return true;
  if (!(error instanceof HttpError)) return false;
  return error.status === RETRYABLE_STATUS || error.status >= 500;
}

export class HttpClient {
  constructor(private readonly baseUrl: string) {}

  async get<T>(
    path: string,
    schema: ResponseSchema<T>,
    params?: Record<string, string>,
  ): Promise<T> {
    const search = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`${path}${search}`, schema);
  }

  async post<T>(
    path: string,
    body: unknown,
    schema: ResponseSchema<T>,
  ): Promise<T> {
    return this.request(path, schema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async patch<T>(
    path: string,
    body: unknown,
    schema: ResponseSchema<T>,
  ): Promise<T> {
    return this.request(path, schema, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  private async request<T>(
    path: string,
    schema: ResponseSchema<T>,
    init?: RequestInit,
  ): Promise<T> {
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

    return schema.parse(await res.json());
  }
}

async function readFailureCode(res: Response): Promise<string | undefined> {
  try {
    const parsed = errorResponseSchema.safeParse(JSON.parse(await res.text()));
    return parsed.success ? parsed.data.code : undefined;
  } catch {
    return undefined;
  }
}
