/** 각 원소는 키 하나를 누른 뒤의 화면이다. 두 명령이 같이 쓰는 앞부분은 지우지 않는다. */
export function retypeFrames(from: string, to: string): string[] {
  let kept = 0;
  while (kept < from.length && kept < to.length && from[kept] === to[kept]) {
    kept += 1;
  }

  const frames: string[] = [];
  for (let length = from.length - 1; length >= kept; length -= 1) {
    frames.push(from.slice(0, length));
  }
  for (let length = kept + 1; length <= to.length; length += 1) {
    frames.push(to.slice(0, length));
  }

  return frames;
}
