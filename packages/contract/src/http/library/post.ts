import * as z from 'zod';
import { defineApi } from '../api.js';
import { CommonErrorCode } from '../error.js';
import { SourceErrorCode } from './source.js';

const summarySchema = z.object({
  /** source의 식별자와 같다. */
  postId: z.string(),
  sourceId: z.string(),
  title: z.string(),
  viewCount: z.number().int().nonnegative(),
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

export const PostSchema = {
  summary: summarySchema,
  post: postSchema,
  searchResult: searchResultSchema,
  cursor: cursorSchema,
};

export type PostSummaryResponse = z.infer<typeof summarySchema>;
export type PostResponse = z.infer<typeof postSchema>;
export type PostSearchResultResponse = z.infer<typeof searchResultSchema>;

export const PostErrorCode = {
  /** 경로의 식별자로 된 post가 없다. */
  NOT_FOUND: 'post.not_found',
  /** 그 source는 이미 발행했다. source 하나에 post는 하나다. */
  ALREADY_EXISTS: 'post.already_exists',
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
    ],
  }),
};
