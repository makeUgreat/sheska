import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleLayout } from './article-layout';

const ONE_HEADING = ['## 배경', '', '본문'].join('\n');

function renderLayout(body: string) {
  render(<ArticleLayout header={<h1>제목</h1>} body={body} />);
}

describe('ArticleLayout', () => {
  it('본문이 비어 있어도 header는 보여준다', () => {
    renderLayout('');

    expect(screen.getByRole('heading', { name: '제목' })).toBeDefined();
  });

  it('footer를 article 안에 렌더링한다', () => {
    render(<ArticleLayout header={<h1>제목</h1>} body={ONE_HEADING} footer={<p>topics</p>} />);

    expect(screen.getByRole('article').contains(screen.getByText('topics'))).toBe(true);
  });

  it('머리, 본문 순서로 24ms 간격을 두고 나타난다', () => {
    renderLayout(ONE_HEADING);

    const header = screen.getByRole('heading', { name: '제목' }).closest('header');
    const body = screen.getByRole('heading', { name: '배경' }).closest<HTMLElement>('div[style]');
    expect([header?.style.animationDelay, body?.style.animationDelay]).toEqual(['0ms', '24ms']);
  });
});
