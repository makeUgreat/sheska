export const Permission = {
  SOURCES_SYNC: 'sources:sync',
  SOURCES_READ: 'sources:read',
  POSTS_PUBLISH: 'posts:publish',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: readonly Permission[] = Object.values(Permission);

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}
