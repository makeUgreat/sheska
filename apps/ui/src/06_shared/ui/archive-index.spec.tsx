import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ArchiveIndex, type ArchiveEntry } from './archive-index';

function buildEntries(titles: string[]): ArchiveEntry[] {
  return titles.map((title) => ({ id: title, href: `/posts/${title}`, title, date: '2026-11-18T00:00:00Z' }));
}

function delayOf(title: string) {
  return screen.getByRole('link', { name: new RegExp(title) }).closest('li')?.style.animationDelay;
}

describe('ArchiveIndex', () => {
  it('처음 보이는 행은 위에서부터 24ms 간격으로 나타난다', () => {
    render(<ArchiveIndex entries={buildEntries(['첫째', '둘째', '셋째'])} />, { wrapper: MemoryRouter });

    expect([delayOf('첫째'), delayOf('둘째'), delayOf('셋째')]).toEqual(['0ms', '24ms', '48ms']);
  });

  it('뒤에 붙은 행은 0ms부터 다시 세고, 이미 보인 행의 지연은 바꾸지 않는다', () => {
    const { rerender } = render(<ArchiveIndex entries={buildEntries(['첫째', '둘째'])} />, { wrapper: MemoryRouter });

    rerender(<ArchiveIndex entries={buildEntries(['첫째', '둘째', '셋째', '넷째'])} />);

    expect([delayOf('첫째'), delayOf('둘째'), delayOf('셋째'), delayOf('넷째')]).toEqual(['0ms', '24ms', '0ms', '24ms']);
  });

  it('목록이 통째로 바뀌면 새 목록을 0ms부터 센다', () => {
    const { rerender } = render(<ArchiveIndex entries={buildEntries(['첫째', '둘째'])} />, { wrapper: MemoryRouter });

    rerender(<ArchiveIndex entries={buildEntries(['검색1', '검색2'])} />);

    expect([delayOf('검색1'), delayOf('검색2')]).toEqual(['0ms', '24ms']);
  });
});
