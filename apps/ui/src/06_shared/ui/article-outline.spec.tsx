import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { type Heading } from '../lib/parse-outline';
import { ArticleOutline } from './article-outline';

const HEADINGS: Heading[] = [
  { depth: 2, text: '배경', id: 'background', line: 1 },
  { depth: 3, text: '기존 방식', id: 'prior-art', line: 5 },
  { depth: 2, text: '결론', id: 'conclusion', line: 9 },
];

function renderOutline(activeId: string | null = null) {
  render(<ArticleOutline headings={HEADINGS} activeId={activeId} />);
  return screen.getByRole('navigation', { name: 'On this page' });
}

describe('ArticleOutline', () => {
  it('접힌 상태에서도 모든 heading을 링크로 노출한다', () => {
    const outline = renderOutline();

    expect(
      within(outline)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['배경', '기존 방식', '결론']);
  });

  it('접힌 상태를 표시하는 눈금은 보조기술에 중복으로 읽히지 않는다', () => {
    const outline = renderOutline();

    expect(within(outline).getAllByRole('listitem')).toHaveLength(
      HEADINGS.length,
    );
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

  /**
   * 펼침 motion은 정지된 화면에서는 드러나지 않는다. jsdom은 실제 transition을
   * 실행하지 않으므로 값 대신 선언이 남아 있는지로 지킨다.
   */
  it('펼침은 opacity transition으로 하고 motion-reduce에서 끈다', () => {
    const outline = renderOutline();
    const panel = within(outline).getByText('On this page').parentElement;

    expect(panel?.className).toContain('transition-opacity');
    expect(panel?.className).toContain('motion-reduce:transition-none');
  });

  it('heading id를 anchor로 연결한다', () => {
    renderOutline();

    expect(
      screen.getByRole('link', { name: '결론' }).getAttribute('href'),
    ).toBe('#conclusion');
  });
});
