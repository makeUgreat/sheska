import { errorResponseSchema } from '@sheska/contract';

/** 계약의 schema처럼 응답 본문을 검증하고 타입을 붙이는 것 */
export interface ResponseSchema<T> {
  parse(data: unknown): T;
}

interface FailureBody {
  code: string;
  details: Record<string, unknown>;
}

export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, statusText: string, failure?: FailureBody) {
    super(`HTTP error: ${status} ${statusText}`);
    this.name = 'HttpError';
    this.status = status;
    this.code = failure?.code;
    this.details = failure?.details ?? {};
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

  async get<T>(path: string, schema: ResponseSchema<T>, params?: Record<string, string>): Promise<T> {
    const search = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`${path}${search}`, schema);
  }

  post<T>(path: string, body: unknown, schema: ResponseSchema<T>): Promise<T>;
  post(path: string, body: unknown): Promise<void>;
  async post<T>(path: string, body: unknown, schema?: ResponseSchema<T>): Promise<T | void> {
    const init = { method: 'POST', body: JSON.stringify(body) };
    if (!schema) return this.send(path, init);
    return this.request(path, schema, init);
  }

  async patch<T>(path: string, body: unknown, schema: ResponseSchema<T>): Promise<T> {
    return this.request(path, schema, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete(path: string): Promise<void> {
    return this.send(path, { method: 'DELETE' });
  }

  /** 응답 본문이 NDJSON stream이다. 줄 하나를 schema로 parse해 도착하는 대로 내준다. */
  async *postStream<T>(path: string, body: unknown, schema: ResponseSchema<T>, signal?: AbortSignal): AsyncGenerator<T> {
    const res = await this.fetch(path, { method: 'POST', body: JSON.stringify(body), signal });
    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = (pending + decoder.decode(value, { stream: true })).split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim()) yield schema.parse(JSON.parse(line));
      }
    }

    if (pending.trim()) yield schema.parse(JSON.parse(pending));
  }

  private async request<T>(path: string, schema: ResponseSchema<T>, init?: RequestInit): Promise<T> {
    const res = await this.fetch(path, init);
    return schema.parse(await res.json());
  }

  /** 응답 본문이 없는 요청(204)이다. 본문을 읽지 않는다. */
  private async send(path: string, init: RequestInit): Promise<void> {
    await this.fetch(path, init);
  }

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    // UI와 API는 출처가 달라서 include여야 세션 쿠키가 실린다.
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      throw new HttpError(res.status, res.statusText, await readFailure(res));
    }
    return res;
  }
}

async function readFailure(res: Response): Promise<FailureBody | undefined> {
  try {
    const parsed = errorResponseSchema.safeParse(JSON.parse(await res.text()));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
