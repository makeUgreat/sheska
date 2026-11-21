import { PostViewClient } from '@contexts/library/domain';
import { describe, expect, it } from 'vitest';

describe('PostViewClient', () => {
  it('User-Agent가 있으면 그 값을 쓴다', () => {
    expect(PostViewClient.of('Mozilla/5.0').unpack()).toBe('Mozilla/5.0');
  });

  it('User-Agent가 없으면 unknown이다', () => {
    expect(PostViewClient.of(undefined).unpack()).toBe('unknown');
  });

  it('User-Agent가 공백뿐이면 unknown이다', () => {
    expect(PostViewClient.of('  ').unpack()).toBe('unknown');
  });
});
