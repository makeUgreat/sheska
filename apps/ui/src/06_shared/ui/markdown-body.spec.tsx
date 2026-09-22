import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { parseOutline } from '../lib/parse-outline';
import { MarkdownBody } from './markdown-body';

function renderBody(body: string) {
  return render(<MarkdownBody body={body} outline={parseOutline(body)} />);
}

describe('MarkdownBody', () => {
  it('wiki link를 unresolved 표기로 바꾼다', () => {
    renderBody('[[feature-sliced-design|FSD]]를 따른다');

    expect(screen.getByTitle('FSD — no note yet')).toBeDefined();
  });

  it('표 안의 wiki link도 unresolved 표기로 바꾼다', () => {
    renderBody(
      ['| Note |', '| --- |', '| [[feature-sliced-design\\|FSD]] |'].join('\n'),
    );

    expect(screen.getByTitle('FSD — no note yet')).toBeDefined();
  });

  it('outline이 가진 heading id를 anchor로 붙인다', () => {
    renderBody('## 설치 방법');

    expect(screen.getByRole('heading', { level: 2 }).id).toBe(
      parseOutline('## 설치 방법')[0].id,
    );
  });
});
