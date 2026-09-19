import { isRetryableHttpError } from './http';

const MAX_QUERY_RETRIES = 2;

export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  return failureCount < MAX_QUERY_RETRIES && isRetryableHttpError(error);
}
