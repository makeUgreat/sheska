// Full Jitter: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
export function applyFullJitter(
  delayMs: number,
  random: () => number = Math.random,
): number {
  return random() * delayMs;
}
