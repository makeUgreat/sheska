import * as z from 'zod';

/**
 * 소유자 API를 부르는 데 필요한 권한이다.
 * 로그인 세션은 모든 권한을 가진다. API 토큰은 발급할 때 고른 권한만 가진다.
 */
export const PERMISSION = {
  /** 노트와 첨부 파일을 올리고, 올린 노트의 동기화 상태를 본다. Obsidian 플러그인이 쓴다. */
  SOURCES_SYNC: 'sources:sync',
  /** 공개하지 않은 노트를 포함해 올린 노트의 목록과 원문을 읽는다. */
  SOURCES_READ: 'sources:read',
  /** 올린 노트를 블로그 글로 공개한다. */
  POSTS_PUBLISH: 'posts:publish',
  /** post의 조회내역(방문자의 IP와 방문 수단)을 읽는다. */
  POST_VIEWS_READ: 'post_views:read',
  /** API 토큰을 발급하고, 목록을 보고, 폐기한다. 이 권한을 받은 토큰은 다른 토큰을 만들 수 있다. */
  API_TOKENS_MANAGE: 'api_tokens:manage',
} as const;

export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];

export const permissionSchema = z.enum(PERMISSION);
