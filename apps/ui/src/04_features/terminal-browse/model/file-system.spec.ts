import { describe, expect, it } from 'vitest';
import { completePath, displayPath, entryFolderOf, resolvePath, subdirectories } from './file-system';

describe('resolvePath', () => {
  it('상대 경로를 현재 폴더 기준으로 푼다', () => {
    expect(resolvePath('posts', '/home/hash')).toBe('/home/hash/posts');
  });

  it('..와 .를 풀어 쓴다', () => {
    expect(resolvePath('../../hash/./sources/', '/home/hash/posts')).toBe('/home/hash/sources');
  });

  it('~를 홈으로 바꾼다', () => {
    expect(resolvePath('~/posts', '/')).toBe('/home/hash/posts');
  });

  it('루트 위로는 올라가지 않는다', () => {
    expect(resolvePath('../..', '/home')).toBe('/');
  });
});

describe('displayPath', () => {
  it('홈 아래 경로는 ~로 줄인다', () => {
    expect(displayPath('/home/hash/sources')).toBe('~/sources');
  });

  it('홈 밖의 경로는 그대로 둔다', () => {
    expect(displayPath('/home')).toBe('/home');
  });
});

describe('subdirectories', () => {
  it('바로 아래 폴더 이름만 돌려준다', () => {
    expect(subdirectories('/')).toEqual(['dev', 'home']);
  });
});

describe('entryFolderOf', () => {
  it('글이 든 폴더 안의 경로면 그 폴더를 돌려준다', () => {
    expect(entryFolderOf('/home/hash/posts/CI/CD 정리')).toBe('/home/hash/posts');
  });

  it('글이 든 폴더 밖이면 undefined를 돌려준다', () => {
    expect(entryFolderOf('/dev/secret')).toBeUndefined();
  });
});

describe('completePath', () => {
  it('입력한 경로 앞부분을 두고 폴더 이름을 채운다', () => {
    expect(completePath('~/p', '/', { files: false })).toEqual(['~/posts/']);
  });

  it('files가 true일 때만 파일 이름도 채운다', () => {
    expect(completePath('/dev/s', '/', { files: true })).toEqual(['/dev/secret']);
    expect(completePath('/dev/s', '/', { files: false })).toEqual([]);
  });
});
