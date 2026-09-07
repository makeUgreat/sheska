export function parseRetryAfterMs(
  headerValue: string | null | undefined,
  now: () => number = Date.now,
): number | undefined {
  if (!headerValue) {
    return undefined;
  }

  const trimmed = headerValue.trim();

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }

  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) {
    return undefined;
  }

  return Math.max(0, dateMs - now());
}
