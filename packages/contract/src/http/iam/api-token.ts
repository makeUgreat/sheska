import * as z from 'zod';
import { defineApi } from '../api.js';
import { CommonErrorCode } from '../error.js';
import { AuthErrorCode } from './auth.js';

/** 모든 API 토큰 원문은 이 글자로 시작한다. 비밀 값 검사 도구가 실수로 드러난 토큰을 찾을 수 있다. */
export const API_TOKEN_PREFIX = 'shk_';

/**
 * 토큰 이름. 소문자, 숫자, `-`만 쓰고 소문자나 숫자로 시작한다. 1자에서 32자다.
 * 터미널에서 `token revoke <name>`처럼 공백 없이 치려고 이렇게 묶는다.
 */
const nameSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{0,31}$/);

const apiTokenSchema = z.object({
  apiTokenId: z.string(),
  name: z.string(),
  /** 원문의 앞 몇 글자. 어느 토큰인지 알아보는 데만 쓴다. 이것으로 인증할 수 없다. */
  hint: z.string(),
  createdAt: z.iso.datetime(),
  /** 이 토큰으로 인증한 마지막 시각. 한 번도 쓰지 않았으면 `null`이다. */
  lastUsedAt: z.iso.datetime().nullable(),
});

export type ApiTokenResponse = z.infer<typeof apiTokenSchema>;

export const ApiTokenErrorCode = {
  /** 쓰고 있는 토큰 중에 같은 이름이 있다. */
  NAME_TAKEN: 'api_token.name_taken',
  /** 경로의 식별자로 된 토큰이 없거나 이미 폐기했다. */
  NOT_FOUND: 'api_token.not_found',
} as const;

/**
 * 소유자가 플러그인 같은 프로그램에 줄 토큰을 발급하고 폐기하는 API다.
 * 로그인 세션으로만 부를 수 있다. API 토큰으로는 부를 수 없다.
 * 토큰은 요청 헤더 `Authorization: Bearer <token>`으로 보낸다.
 */
export const ApiTokenApi = {
  /** 201이다. 원문 `token`은 이 응답에서 한 번만 준다. 서버는 원문을 저장하지 않는다. */
  issue: defineApi({
    method: 'POST',
    path: '/api-tokens',
    request: z.strictObject({ name: nameSchema }),
    response: apiTokenSchema.extend({
      token: z.string().startsWith(API_TOKEN_PREFIX),
    }),
    errors: [
      CommonErrorCode.VALIDATION_FAILED,
      AuthErrorCode.UNAUTHENTICATED,
      ApiTokenErrorCode.NAME_TAKEN,
    ],
  }),

  /** 폐기하지 않은 토큰만 만든 순서대로 준다. */
  list: defineApi({
    method: 'GET',
    path: '/api-tokens',
    response: z.object({ apiTokens: z.array(apiTokenSchema) }),
    errors: [AuthErrorCode.UNAUTHENTICATED],
  }),

  /** 204다. 폐기한 토큰은 다음 요청부터 거절한다. */
  revoke: defineApi({
    method: 'DELETE',
    path: '/api-tokens/:id',
    errors: [AuthErrorCode.UNAUTHENTICATED, ApiTokenErrorCode.NOT_FOUND],
  }),
};
