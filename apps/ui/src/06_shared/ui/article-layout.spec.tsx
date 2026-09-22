import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { parseOutline } from '../lib/parse-outline';
import { ArticleLayout } from './article-layout';

const TWO_HEADINGS = ['## 배경', '', '본문', '', '## 결론', '', '본문'].join(
  '\n',
);

const ONE_HEADING = ['## 배경', '', '본문'].join('\n');

function renderLayout(body: string) {
  render(
    <ArticleLayout
      header={<h1>제목</h1>}
      body={body}
      outline={parseOutline(body)}
      activeHeadingId={null}
    />,
  );
}

describe('ArticleLayout', () => {
  it('heading이 둘 이상이면 outline navigation을 보여준다', () => {
    renderLayout(TWO_HEADINGS);

    expect(
      screen.getByRole('navigation', { name: 'On this page' }),
    ).toBeDefined();
  });

  it('heading이 하나뿐이면 outline navigation을 보여주지 않는다', () => {
    renderLayout(ONE_HEADING);

    expect(
      screen.queryByRole('navigation', { name: 'On this page' }),
    ).toBeNull();
  });

  it('본문이 비어 있어도 header는 보여준다', () => {
    renderLayout('');

    expect(screen.getByRole('heading', { name: '제목' })).toBeDefined();
  });

  it('footer를 article 안에 렌더링한다', () => {
    render(
      <ArticleLayout
        header={<h1>제목</h1>}
        body={ONE_HEADING}
        outline={parseOutline(ONE_HEADING)}
        activeHeadingId={null}
        footer={<p>topics</p>}
      />,
    );

    expect(
      screen.getByRole('article').contains(screen.getByText('topics')),
    ).toBe(true);
  });
});
