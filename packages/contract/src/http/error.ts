import * as z from 'zod';

export const errorResponseSchema = z.object({
  /**
   * 오류 원인. 클라이언트는 HTTP status가 아니라 이 값으로 오류를 구분한다.
   * API가 돌려줄 수 있는 값은 API별 `errors`에 있지만, 목록에 없는 값도 올 수 있다.
   */
  code: z.string(),
  /** 원인을 찾기 위한 설명이다. 프로그램이 이 문구에 기대지 않는다. */
  message: z.string(),
  /** 클라이언트가 조치할 때 쓰는 값. 모양은 `code`마다 계약에 따로 정한다. 없으면 빈 객체다. */
  details: z.record(z.string(), z.unknown()),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const CommonErrorCode = {
  /**
   * 요청이 계약의 schema와 맞지 않는다.
   * `details.fields`에 `{ path, messages }` 목록으로 어느 값이 왜 틀렸는지 담는다.
   */
  VALIDATION_FAILED: 'request.validation_failed',
  /** 요청한 경로가 없다. */
  ROUTE_NOT_FOUND: 'http.404',
  /** 예상하지 못한 서버 오류다. 모든 API가 돌려줄 수 있어서 API별 `errors`에 넣지 않는다. */
  INTERNAL_UNEXPECTED: 'internal.unexpected',
  /** 서버가 의존하는 서비스에 잠시 닿지 못한다. 다시 시도하면 될 수 있다. 모든 API가 돌려줄 수 있어서 API별 `errors`에 넣지 않는다. */
  INTERNAL_UNAVAILABLE: 'internal.unavailable',
} as const;
