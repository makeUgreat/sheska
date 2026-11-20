import * as z from 'zod';
import { defineApi } from '../api.js';
import { AuthErrorCode } from '../iam/auth.js';
import { CommonErrorCode } from '../error.js';
import { SourceErrorCode } from './source.js';

/**
 * AI가 본문으로 만든 요약. 요약은 발행과 따로 만들어지므로 post보다 늦게 준비된다.
 * `pending`은 아직 만들지 않았고, `failed`는 만들다 실패했고, `ready`는 `lines`에 요약이 있다.
 */
const aiSummarySchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('failed') }),
  z.object({
    status: z.literal('ready'),
    /** 한 줄에 한 문장이다. 줄 수는 정해져 있지 않다. */
    lines: z.array(z.string()).min(1),
  }),
]);

const summarySchema = z.object({
  /** source의 식별자와 같다. */
  postId: z.string(),
  sourceId: z.string(),
  title: z.string(),
  viewCount: z.number().int().nonnegative(),
  summary: aiSummarySchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const postSchema = summarySchema.extend({
  body: z.string(),
});

const searchResultSchema = summarySchema.extend({
  /** 키워드 검색(`keyword`), 의미 검색(`semantic`), 둘 다(`both`) 중 어디서 찾았는지. */
  matchReason: z.enum(['keyword', 'semantic', 'both']),
  /** 의미 검색 유사도. 0에서 100 사이의 정수(%)다. 의미 검색으로 찾지 않았으면 `null`이다. */
  similarity: z.number().int().nullable(),
  /** 검색어가 나온 부분과 그 앞뒤. 검색어가 그대로 나오지 않으면 `null`이다. */
  snippet: z.string().nullable(),
});

/** 다음 페이지를 받을 때 그대로 돌려보내는 값. 내용에 기대지 않는다. */
const cursorSchema = z.string();

const limitSchema = z.coerce.number<number>().int().positive().max(100).default(20);

const questionTurnSchema = z.strictObject({
  question: z.string().min(1),
  answer: z.string(),
});

const answerEventSchema = z.discriminatedUnion('type', [
  /** 답의 다음 조각이다. 받은 순서대로 이어 붙인다. */
  z.object({ type: z.literal('delta'), text: z.string() }),
  /**
   * 답이 끝났다. 이 줄 뒤로 stream이 끝난다.
   * `sources`는 답의 근거가 된 본문 heading의 글자다. 근거로 든 heading이 없으면 빈 배열이다.
   */
  z.object({ type: z.literal('done'), sources: z.array(z.string()) }),
  /** 답을 보내다 실패했다. 이 줄 뒤로 stream이 끝난다. 앞서 받은 조각은 버리지 않는다. */
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
]);

export const PostSchema = {
  summary: summarySchema,
  post: postSchema,
  searchResult: searchResultSchema,
  cursor: cursorSchema,
  answerEvent: answerEventSchema,
};

export type PostSummaryResponse = z.infer<typeof summarySchema>;
export type PostAiSummaryResponse = z.infer<typeof aiSummarySchema>;
export type PostResponse = z.infer<typeof postSchema>;
export type PostSearchResultResponse = z.infer<typeof searchResultSchema>;

export const PostErrorCode = {
  /** 경로의 식별자로 된 post가 없다. */
  NOT_FOUND: 'post.not_found',
  /** 그 source는 이미 발행했다. source 하나에 post는 하나다. */
  ALREADY_EXISTS: 'post.already_exists',
  /** 질문을 너무 자주 보냈다. `details.retryAfterSeconds`초 뒤에 다시 보낼 수 있다. */
  QUESTION_RATE_LIMITED: 'post.question_rate_limited',
} as const;

export const PostApi = {
  list: defineApi({
    method: 'GET',
    path: '/posts',
    query: z.strictObject({
      cursor: cursorSchema.optional(),
      limit: limitSchema,
    }),
    response: z.object({
      posts: z.array(summarySchema),
      /** 마지막 페이지면 `null`이다. */
      nextCursor: cursorSchema.nullable(),
    }),
    errors: [CommonErrorCode.VALIDATION_FAILED],
  }),

  search: defineApi({
    method: 'GET',
    path: '/posts/search',
    query: z.strictObject({
      /** 검색어. 앞뒤 공백은 서버가 지운다. */
      q: z.string().trim().min(1),
      /** 같은 검색어로 받은 `nextCursor`만 보낸다. */
      cursor: cursorSchema.optional(),
      limit: limitSchema,
    }),
    response: z.object({
      posts: z.array(searchResultSchema),
      /** 마지막 페이지면 `null`이다. */
      nextCursor: cursorSchema.nullable(),
      /** 의미 검색이 실패해 키워드 검색 결과만 돌려줬으면 `false`다. */
      semanticSearchApplied: z.boolean(),
    }),
    errors: [CommonErrorCode.VALIDATION_FAILED],
  }),

  count: defineApi({
    method: 'GET',
    path: '/posts/count',
    response: z.object({
      count: z.number().int().nonnegative(),
    }),
    errors: [],
  }),

  /** 조회할 때마다 조회수가 1 는다. */
  get: defineApi({
    method: 'GET',
    path: '/posts/:id',
    response: postSchema,
    errors: [PostErrorCode.NOT_FOUND],
  }),

  /**
   * (미구현) post 본문을 근거로 질문에 답한다. 답은 `streamEvent` 줄로 흘려 보낸다.
   * 서버는 질문과 답을 저장하지 않는다. 앞선 질문과 답은 클라이언트가 `history`로 보낸다.
   */
  ask: defineApi({
    method: 'POST',
    path: '/posts/:id/questions',
    request: z.strictObject({
      /** 앞뒤 공백은 서버가 지운다. */
      question: z.string().trim().min(1).max(500),
      /** 같은 화면에서 앞서 끝난 질문과 답이다. 오래된 것부터 담는다. */
      history: z.array(questionTurnSchema).max(10).default([]),
    }),
    streamEvent: answerEventSchema,
    errors: [CommonErrorCode.VALIDATION_FAILED, PostErrorCode.NOT_FOUND, PostErrorCode.QUESTION_RATE_LIMITED],
  }),

  /** source를 post로 발행한다. 동기화나 임베딩이 끝나기 전에도 발행할 수 있다. */
  publish: defineApi({
    method: 'POST',
    path: '/posts',
    request: z.strictObject({
      sourceId: z.string().min(1),
    }),
    response: summarySchema,
    errors: [
      CommonErrorCode.VALIDATION_FAILED,
      SourceErrorCode.NOT_FOUND,
      PostErrorCode.ALREADY_EXISTS,
      AuthErrorCode.UNAUTHENTICATED,
      AuthErrorCode.FORBIDDEN,
    ],
  }),
};
