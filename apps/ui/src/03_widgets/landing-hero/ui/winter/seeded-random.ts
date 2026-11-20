/** 렌더마다 자리가 바뀌지 않게 seed를 고정한 난수다. */
export function seededRandom(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}
