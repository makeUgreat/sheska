import { describe, expect, it } from 'vitest';
import { extractFrontmatterTitle } from '../extract-frontmatter-title';

describe('extractFrontmatterTitle', () => {
  it('title 필드가 있는 프론트매터에서 title을 반환한다', () => {
    const content = '---\ntitle: 테스트 제목\n---\n본문 내용';
    expect(extractFrontmatterTitle(content)).toBe('테스트 제목');
  });

  it('title 앞뒤 공백을 제거한다', () => {
    const content = '---\ntitle:   공백 있는 제목   \n---';
    expect(extractFrontmatterTitle(content)).toBe('공백 있는 제목');
  });

  it('복수 필드가 있는 프론트매터에서 title만 반환한다', () => {
    const content =
      '---\ndate: 2024-01-01\ntitle: 여러 필드\ntags: [a, b]\n---\n본문';
    expect(extractFrontmatterTitle(content)).toBe('여러 필드');
  });

  it('title 키가 없는 프론트매터면 null을 반환한다', () => {
    const content = '---\ndate: 2024-01-01\ntags: [a, b]\n---\n본문';
    expect(extractFrontmatterTitle(content)).toBeNull();
  });

  it('프론트매터가 없으면 null을 반환한다', () => {
    const content = '# 마크다운 제목\n\n본문 내용';
    expect(extractFrontmatterTitle(content)).toBeNull();
  });

  it('빈 문자열이면 null을 반환한다', () => {
    expect(extractFrontmatterTitle('')).toBeNull();
  });

  it('닫는 --- 가 없으면 null을 반환한다', () => {
    const content = '---\ntitle: 제목\n본문';
    expect(extractFrontmatterTitle(content)).toBeNull();
  });
});
