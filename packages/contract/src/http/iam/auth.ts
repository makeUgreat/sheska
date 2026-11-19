import * as z from 'zod';
import { defineApi } from '../api.js';
import { CommonErrorCode } from '../error.js';

/** 이보다 긴 비밀번호는 hash 계산 전에 거부한다. */
export const PASSWORD_MAX_LENGTH = 1024;

const logInRequestSchema = z.object({
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

const sessionSchema = z.object({
  /** 요청에 유효한 세션 쿠키가 있으면 `true`다. */
  authenticated: z.boolean(),
});

export const AuthErrorCode = {
  /** 비밀번호가 틀렸다. */
  INVALID_CREDENTIALS: 'auth.invalid_credentials',
  /**
   * 같은 IP에서 로그인을 너무 많이 틀렸다.
   * `details.retryAfterSeconds`초가 지나면 다시 시도할 수 있다.
   */
  TOO_MANY_ATTEMPTS: 'auth.too_many_attempts',
  /** 이 API는 로그인 세션이 있어야 한다. 세션이 없거나 만료됐다. */
  UNAUTHENTICATED: 'auth.unauthenticated',
} as const;

/** 소유자가 브라우저에서 로그인하고 로그아웃하는 API다. 세션은 `HttpOnly` 쿠키로 주고받는다. */
export const AuthApi = {
  /** 성공하면 204이고 세션 쿠키를 설정한다. */
  logIn: defineApi({
    method: 'POST',
    path: '/auth/session',
    request: logInRequestSchema,
    errors: [
      CommonErrorCode.VALIDATION_FAILED,
      AuthErrorCode.INVALID_CREDENTIALS,
      AuthErrorCode.TOO_MANY_ATTEMPTS,
    ],
  }),

  /** 세션을 지우고 쿠키를 만료시킨다. 세션이 없어도 204다. */
  logOut: defineApi({
    method: 'DELETE',
    path: '/auth/session',
    errors: [],
  }),

  /** 로그인하지 않았어도 200이다. */
  session: defineApi({
    method: 'GET',
    path: '/auth/session',
    response: sessionSchema,
    errors: [],
  }),
};
