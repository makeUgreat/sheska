export const PERMISSION = {
  SOURCES_SYNC: 'sources:sync',
  SOURCES_READ: 'sources:read',
  POSTS_PUBLISH: 'posts:publish',
  API_TOKENS_MANAGE: 'api_tokens:manage',
} as const;

export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];

export const ALL_PERMISSIONS: readonly Permission[] = Object.values(PERMISSION);

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}
