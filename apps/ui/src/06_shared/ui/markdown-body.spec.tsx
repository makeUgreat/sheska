import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { parseOutline } from '../lib/parse-outline';
import { MarkdownBody } from './markdown-body';

function renderBody(body: string) {
  return render(<MarkdownBody body={body} outline={parseOutline(body)} />);
}

describe('MarkdownBody', () => {
  it('GFM 표 문법을 table로 렌더한다', () => {
    renderBody(
      ['| Option | Default |', '| --- | --- |', '| retry | 3 |'].join('\n'),
    );

    const table = screen.getByRole('table');
    expect(
      within(table).getByRole('columnheader', { name: 'Option' }),
    ).toBeDefined();
    expect(within(table).getByRole('cell', { name: 'retry' })).toBeDefined();
  });

  it('취소선 문법을 del로 렌더한다', () => {
    renderBody('~~폐기된 방식~~을 더 쓰지 않는다');

    expect(screen.getByRole('deletion').textContent).toBe('폐기된 방식');
  });

  it('task list의 체크 상태를 그대로 보여준다', () => {
    renderBody(['- [x] 끝난 일', '- [ ] 남은 일'].join('\n'));

    const [done, todo] = screen.getAllByRole('checkbox');
    expect((done as HTMLInputElement).checked).toBe(true);
    expect((todo as HTMLInputElement).checked).toBe(false);
  });

  it('맨 URL을 링크로 만든다', () => {
    renderBody('참고: https://example.com/docs');

    expect(
      screen.getByRole('link', { name: 'https://example.com/docs' }),
    ).toBeDefined();
  });

  it('언어 표기가 없는 코드 펜스도 inline code 강조색을 쓰지 않는다', () => {
    const { container } = renderBody(['```', 'fd 5 준비됨', '```'].join('\n'));

    const code = container.querySelector('pre code');
    expect(code?.className).toBe('');
  });

  it('inline code는 강조색으로 구분한다', () => {
    const { container } = renderBody('`read()`를 호출한다');

    const code = container.querySelector('code');
    expect(code?.className).toContain('text-accent-strong');
  });

  it('표 안의 wiki link도 unresolved 표기로 바꾼다', () => {
    renderBody(
      ['| Note |', '| --- |', '| [[feature-sliced-design\\|FSD]] |'].join('\n'),
    );

    expect(screen.getByTitle('FSD — no note yet')).toBeDefined();
  });
});
