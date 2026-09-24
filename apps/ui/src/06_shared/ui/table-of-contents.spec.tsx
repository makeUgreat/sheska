import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { type Heading } from '../lib/markdown';
import { TableOfContents } from './table-of-contents';

const HEADINGS: Heading[] = [
  { depth: 2, text: '배경', id: 'background' },
  { depth: 3, text: '기존 방식', id: 'prior-art' },
  { depth: 2, text: '결론', id: 'conclusion' },
];

function renderOutline(activeId: string | null = null) {
  render(<TableOfContents headings={HEADINGS} activeId={activeId} />);
  return screen.getByRole('navigation', { name: 'On this page' });
}

describe('TableOfContents', () => {
  it('모든 heading을 링크로 노출한다', () => {
    const outline = renderOutline();

    expect(
      within(outline)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['배경', '기존 방식', '결론']);
  });

  it('한 줄에 담기지 않는 제목도 전체를 읽을 수 있게 title로 남긴다', () => {
    const outline = renderOutline();

    expect(
      within(outline)
        .getAllByRole('link')
        .map((link) => link.getAttribute('title')),
    ).toEqual(['배경', '기존 방식', '결론']);
  });

  it('현재 위치인 heading에만 aria-current를 준다', () => {
    renderOutline('prior-art');

    expect(
      screen
        .getByRole('link', { name: '기존 방식' })
        .getAttribute('aria-current'),
    ).toBe('location');
    expect(
      screen.getByRole('link', { name: '배경' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('본문이 쓴 가장 얕은 단계를 기준으로 들여쓴다', () => {
    const deepOnly: Heading[] = [
      { depth: 4, text: '첫 절', id: 'first' },
      { depth: 5, text: '그 아래', id: 'second' },
    ];
    render(<TableOfContents headings={deepOnly} activeId={null} />);

    expect(screen.getByRole('link', { name: '첫 절' }).className).not.toContain(
      'pl-',
    );
    expect(screen.getByRole('link', { name: '그 아래' }).className).toContain(
      'pl-3',
    );
  });

  it('`#` 아래의 `##`을 한 단계 들여쓴다', () => {
    const fromTop: Heading[] = [
      { depth: 1, text: '개요', id: 'overview' },
      { depth: 2, text: '설치', id: 'install' },
    ];
    render(<TableOfContents headings={fromTop} activeId={null} />);

    expect(screen.getByRole('link', { name: '설치' }).className).toContain(
      'pl-3',
    );
  });

  it('heading id를 anchor로 연결한다', () => {
    renderOutline();

    expect(
      screen.getByRole('link', { name: '결론' }).getAttribute('href'),
    ).toBe('#conclusion');
  });
});
