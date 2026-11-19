import * as z from 'zod';

/**
 * 소유자 API를 부르는 데 필요한 권한이다.
 * 로그인 세션은 모든 권한을 가진다. API 토큰은 발급할 때 고른 권한만 가진다.
 */
export const Permission = {
  /** 노트와 첨부 파일을 올리고, 올린 노트의 동기화 상태를 본다. Obsidian 플러그인이 쓴다. */
  SOURCES_SYNC: 'sources:sync',
  /** 공개하지 않은 노트를 포함해 올린 노트의 목록과 원문을 읽는다. */
  SOURCES_READ: 'sources:read',
  /** 올린 노트를 블로그 글로 공개한다. */
  POSTS_PUBLISH: 'posts:publish',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const permissionSchema = z.enum(Permission);
