import { describe, expect, it } from 'vitest';
import { retypeFrames } from './retype-frames';

describe('retypeFrames', () => {
  it('같이 쓰는 앞부분까지 지운 뒤 새 명령을 친다', () => {
    expect(retypeFrames('cd ~/ab', 'cd ~/x')).toEqual(['cd ~/a', 'cd ~/', 'cd ~/x']);
  });

  it('명령이 같으면 누를 키가 없다', () => {
    expect(retypeFrames('open ~/posts', 'open ~/posts')).toEqual([]);
  });

  it('새 명령이 앞부분이면 지우기만 한다', () => {
    expect(retypeFrames('cd ~/a', 'cd ~/')).toEqual(['cd ~/']);
  });
});
