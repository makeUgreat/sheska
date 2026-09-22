import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Markdown } from './markdown';
import { createMarkdownComponents } from './markdown-components';

describe('Markdown', () => {
  it('GFM 표 문법을 table로 렌더한다', () => {
    render(
      <Markdown
        body={['| Option | Default |', '| --- | --- |', '| retry | 3 |'].join(
          '\n',
        )}
      />,
    );

    const table = screen.getByRole('table');
    expect(
      within(table).getByRole('columnheader', { name: 'Option' }),
    ).toBeDefined();
    expect(within(table).getByRole('cell', { name: 'retry' })).toBeDefined();
  });

  it('취소선 문법을 del로 렌더한다', () => {
    render(<Markdown body="~~폐기된 방식~~을 더 쓰지 않는다" />);

    expect(screen.getByRole('deletion').textContent).toBe('폐기된 방식');
  });

  it('task list의 체크 상태를 그대로 보여준다', () => {
    render(<Markdown body={['- [x] 끝난 일', '- [ ] 남은 일'].join('\n')} />);

    const [done, todo] = screen.getAllByRole('checkbox');
    expect((done as HTMLInputElement).checked).toBe(true);
    expect((todo as HTMLInputElement).checked).toBe(false);
  });

  it('맨 URL을 링크로 만든다', () => {
    render(<Markdown body="참고: https://example.com/docs" />);

    expect(
      screen.getByRole('link', { name: 'https://example.com/docs' }),
    ).toBeDefined();
  });

  it('본문의 최상위 heading을 h2로 낮춘다', () => {
    render(<Markdown body="# 문서 제목" />);

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      '문서 제목',
    );
  });
});

describe('createMarkdownComponents', () => {
  it('headingId가 돌려준 값을 heading anchor로 붙인다', () => {
    render(
      <Markdown
        body="## 설치"
        components={createMarkdownComponents({ headingId: () => 'install' })}
      />,
    );

    expect(screen.getByRole('heading', { level: 2 }).id).toBe('install');
  });
});

function fence(language: string, ...lines: string[]) {
  return ['```' + language, ...lines, '```'].join('\n');
}

/** Highlighter는 나중에 도착하므로 fence에 hljs class가 붙을 때까지 기다린다. */
async function renderFence(body: string) {
  const view = render(<Markdown body={body} />);

  await waitFor(() =>
    expect(view.container.querySelector('.hljs')).not.toBe(null),
  );
  return view;
}

describe('Markdown 코드 펜스', () => {
  it('fence에 적은 언어를 라벨로 보여준다', async () => {
    await renderFence(fence('ts', 'const retry = 3;'));

    expect(screen.getByText('ts')).toBeDefined();
  });

  it('등록한 언어의 keyword를 highlight token으로 쪼갠다', async () => {
    const { container } = await renderFence(fence('ts', 'const retry = 3;'));

    expect(container.querySelector('.hljs-keyword')?.textContent).toBe('const');
  });

  it('등록하지 않은 언어는 원문 그대로 둔다', async () => {
    const { container } = await renderFence(
      fence('brainfuck', '+[----->+++<]>+.'),
    );

    expect(container.querySelector('.hljs-keyword')).toBe(null);
    expect(screen.getByText('+[----->+++<]>+.')).toBeDefined();
  });

  it('복사 버튼이 fence 원문을 클립보드에 넣는다', async () => {
    const user = userEvent.setup();
    await renderFence(fence('ts', 'const retry = 3;'));

    await user.click(screen.getByRole('button', { name: 'Copy code' }));

    expect(await navigator.clipboard.readText()).toBe('const retry = 3;\n');
  });

  it('복사한 뒤 결과를 status로 알린다', async () => {
    const user = userEvent.setup();
    await renderFence(fence('ts', 'const retry = 3;'));

    expect(screen.getByRole('status').textContent).toBe('');
    await user.click(screen.getByRole('button', { name: 'Copy code' }));

    expect((await screen.findByRole('status')).textContent).toBe('Copied');
  });

  it('inline code에는 코드 블록 chrome을 붙이지 않는다', () => {
    render(<Markdown body="옵션은 `retry`다" />);

    expect(screen.queryByRole('button', { name: 'Copy code' })).toBe(null);
    expect(screen.getByText('retry').tagName).toBe('CODE');
  });
});
