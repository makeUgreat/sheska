import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
  it('decorateText로 감싼 inline text를 그대로 사용한다', () => {
    render(
      <Markdown
        body="첫 문장"
        components={createMarkdownComponents({
          decorateText: (children) => <mark>{children}</mark>,
        })}
      />,
    );

    expect(screen.getByText('첫 문장').tagName).toBe('MARK');
  });

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
