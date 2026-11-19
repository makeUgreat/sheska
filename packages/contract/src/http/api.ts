import type { z } from 'zod';
import type { Permission } from './iam/permission.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * 이 API를 부를 수 있는 사람이다.
 * - `public`: 누구나 부른다. 요청에 든 인증 정보는 보지 않는다.
 * - `authenticated`: 로그인 세션 쿠키나 `Authorization: Bearer <API 토큰>`으로 인증한 요청만 부른다.
 * - `session`: 로그인 세션으로 인증한 요청만 부른다. API 토큰을 만들고 지우는 일처럼 비밀번호를 아는 사람이 직접 해야 하는 일이다.
 * - 권한 이름: 인증한 요청 중 그 권한을 가진 요청만 부른다. 로그인 세션은 모든 권한을 가진다.
 *
 * 인증에 실패하면 401 `auth.unauthenticated`, 권한이 없거나 `session` API를 API 토큰으로 부르면 403 `auth.forbidden`이다.
 */
export type ApiAccess = 'public' | 'authenticated' | 'session' | Permission;

export interface ApiContract {
  readonly method: HttpMethod;
  /** 서버 라우팅 문법으로 적는다. 경로에 든 값은 `:이름`이다. 예: `/sources/:id` */
  readonly path: string;
  readonly access: ApiAccess;
  /** query string. 값은 문자열로 오므로 숫자는 `z.coerce`로 받는다. */
  readonly query?: z.ZodType;
  /** JSON 본문 */
  readonly request?: z.ZodType;
  /** 본문이 JSON이 아니라 파일 바이트 그대로다. `Content-Type: application/octet-stream`으로 보낸다. */
  readonly binaryRequest?: true;
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
