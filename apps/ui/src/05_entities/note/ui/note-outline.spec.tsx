import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { type Heading } from '../lib/parse-outline';
import { NoteOutline } from './note-outline';

const HEADINGS: Heading[] = [
  { depth: 2, text: '배경', id: 'background', line: 1 },
  { depth: 3, text: '기존 방식', id: 'prior-art', line: 5 },
  { depth: 2, text: '결론', id: 'conclusion', line: 9 },
];

function renderOutline(activeId: string | null = null) {
  render(<NoteOutline headings={HEADINGS} activeId={activeId} />);
  return screen.getByRole('navigation', { name: 'On this page' });
}

describe('NoteOutline', () => {
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

  it('heading id를 anchor로 연결한다', () => {
    renderOutline();

    expect(
      screen.getByRole('link', { name: '결론' }).getAttribute('href'),
    ).toBe('#conclusion');
  });
});
