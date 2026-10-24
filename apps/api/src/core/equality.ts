import { isDeepStrictEqual } from 'node:util';

export function isDeepEqual(left: unknown, right: unknown): boolean {
  return isDeepStrictEqual(left, right);
}
