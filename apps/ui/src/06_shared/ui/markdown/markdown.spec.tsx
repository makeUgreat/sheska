import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseOutline } from '../../lib/markdown';
import { Markdown } from './markdown';

function renderBody(body: string) {
  return render(<Markdown body={body} />);
}

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

  it('물결표 하나는 취소선으로 읽지 않는다', () => {
    render(<Markdown body="1~2장 그리고 3~4장" />);

    expect(screen.queryByRole('deletion')).toBe(null);
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

  it('page 제목 아래에 놓이도록 heading을 한 단계씩 낮춘다', () => {
    render(
      <Markdown
        body={['# 하나', '## 둘', '### 셋', '#### 넷', '##### 다섯'].join('\n')}
      />,
    );

    expect(
      [2, 3, 4, 5, 6].map(
        (level) => screen.getByRole('heading', { level }).textContent,
      ),
    ).toEqual(['하나', '둘', '셋', '넷', '다섯']);
  });

  it('더 내려갈 단계가 없는 `######`은 h6에 둔다', () => {
    render(<Markdown body="###### 여섯" />);

    expect(screen.getByRole('heading', { level: 6 }).textContent).toBe('여섯');
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

  it('목록 항목 안의 fence도 highlight한다', async () => {
    const { container } = await renderFence(
      ['- 설정', '', '  ```ts', '  const retry = 3;', '  ```'].join('\n'),
    );

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

describe('Markdown vault 문법', () => {
  it('wiki link를 unresolved 표기로 바꾼다', () => {
    renderBody('[[feature-sliced-design|FSD]]를 따른다');

    expect(screen.getByTitle('FSD — no note yet')).toBeDefined();
  });

  it('강조 안의 wiki link도 unresolved 표기로 바꾼다', () => {
    renderBody('- **[[feature-sliced-design|FSD]]**');

    expect(screen.getByTitle('FSD — no note yet')).toBeDefined();
  });

  it('표 안의 wiki link도 unresolved 표기로 바꾼다', () => {
    renderBody(
      ['| Note |', '| --- |', '| [[feature-sliced-design\\|FSD]] |'].join('\n'),
    );

    expect(screen.getByTitle('FSD — no note yet')).toBeDefined();
  });

  it('code fence 안의 wiki link 문법은 원문 그대로 둔다', () => {
    renderBody(['```txt', '[[feature-sliced-design|FSD]]', '```'].join('\n'));

    expect(screen.queryByTitle('FSD — no note yet')).toBe(null);
    expect(screen.getByText('[[feature-sliced-design|FSD]]')).toBeDefined();
  });

  it('블록 표시는 본문에 글자로 남기지 않는다', () => {
    renderBody(['인용 밖 문단', '', '^36406d'].join('\n'));

    expect(screen.queryByText(/\^36406d/)).toBe(null);
  });

  it('블록 표시는 바로 앞 블록을 anchor로 만든다', () => {
    renderBody(['인용 밖 문단', '', '^36406d'].join('\n'));

    expect(screen.getByText('인용 밖 문단').id).toBe('block-36406d');
  });

  it('인용 마지막 줄의 블록 표시는 인용 전체를 anchor로 만든다', () => {
    const { container } = renderBody(['> 인용한 문장', '> ^c58057'].join('\n'));

    expect(container.querySelector('blockquote')?.id).toBe('block-c58057');
  });

  it('인용 안 code fence 뒤의 블록 표시도 인용 전체를 anchor로 만든다', () => {
    const { container } = renderBody(
      [
        '> [!example] 문법',
        '>',
        '> ```ts',
        '> const a = 1;',
        '> ```',
        '>^b33468',
      ].join('\n'),
    );

    expect(container.querySelector('blockquote')?.id).toBe('block-b33468');
  });

  it('같은 노트 block reference는 그 anchor로 가는 링크가 된다', () => {
    renderBody(
      ['- [[#^c58057|의존성 배열]]', '', '> 인용한 문장', '> ^c58057'].join(
        '\n',
      ),
    );

    expect(
      screen.getByRole('link', { name: '의존성 배열' }).getAttribute('href'),
    ).toBe('#block-c58057');
  });

  it('본문에 없는 block을 가리키는 참조는 unresolved로 둔다', () => {
    renderBody('- [[#^c58057|의존성 배열]]');

    expect(screen.queryByRole('link', { name: '의존성 배열' })).toBe(null);
    expect(screen.getByTitle('의존성 배열 — no note yet')).toBeDefined();
  });

  it('tight list 항목 끝의 블록 표시는 항목 자체를 anchor로 만든다', () => {
    const { container } = renderBody(
      ['- 첫 항목', '- 둘째 항목', '  ^e23126'].join('\n'),
    );

    expect(container.querySelector('li#block-e23126')?.textContent).toBe(
      '둘째 항목',
    );
  });

  it('표 바로 뒤의 블록 표시는 표 전체를 anchor로 만든다', () => {
    const { container } = renderBody(
      ['| 칸 |', '| --- |', '| 값 |', '^c5ce9a'].join('\n'),
    );

    expect(
      container.querySelector('#block-c5ce9a')?.querySelector('table'),
    ).not.toBe(null);
  });

  it('code fence 안의 블록 표시는 원문 그대로 둔다', () => {
    renderBody(['```txt', '^c58057', '```'].join('\n'));

    expect(screen.getByText('^c58057')).toBeDefined();
  });

  it('heading에 outline과 같은 id를 붙인다', () => {
    renderBody('# 설치 방법');

    expect(screen.getByRole('heading', { level: 2 }).id).toBe(
      parseOutline('# 설치 방법')[0].id,
    );
  });
});
