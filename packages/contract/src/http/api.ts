import type { z } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiContract {
  readonly method: HttpMethod;
  /** 서버 라우팅 문법으로 적는다. 경로에 든 값은 `:이름`이다. 예: `/sources/:id` */
  readonly path: string;
  /** query string. 값은 문자열로 오므로 숫자는 `z.coerce`로 받는다. */
  readonly query?: z.ZodType;
  /** JSON 본문 */
  readonly request?: z.ZodType;
  readonly response?: z.ZodType;
  /**
   * 이 API가 돌려줄 수 있는 오류 code.
   * 모든 API가 돌려줄 수 있는 `internal.unexpected`, `internal.unavailable`은 넣지 않는다.
   */
  readonly errors: readonly string[];
}

export function defineApi<const T extends ApiContract>(api: T): T {
  return api;
}

export type ApiQuery<T extends ApiContract> = T['query'] extends z.ZodType
  ? z.input<T['query']>
  : never;

export type ApiRequest<T extends ApiContract> = T['request'] extends z.ZodType
  ? z.input<T['request']>
  : never;

export type ApiResponse<T extends ApiContract> = T['response'] extends z.ZodType
  ? z.infer<T['response']>
  : never;

export type ApiErrorCode<T extends ApiContract> = T['errors'][number];

type PathParam<P extends string> =
  P extends `${string}:${infer Name}/${infer Rest}`
    ? Name | PathParam<`/${Rest}`>
    : P extends `${string}:${infer Name}`
      ? Name
      : never;

export function pathOf<T extends ApiContract>(
  api: T,
  params: Record<PathParam<T['path']>, string>,
): string {
  return api.path.replace(/:(\w+)/g, (_, name: string) =>
    encodeURIComponent((params as Record<string, string>)[name]),
  );
}
