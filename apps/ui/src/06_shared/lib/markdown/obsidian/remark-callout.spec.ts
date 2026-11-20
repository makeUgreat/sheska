import { type Blockquote, type RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../markdown-plugins';
import { CALLOUT_ELEMENT, CALLOUT_TITLE_ELEMENT } from './remark-callout';

function quoteOf(body: string): Blockquote {
  const quote = parseMarkdown(body).children.find((child) => child.type === 'blockquote');
  if (!quote) throw new Error('blockquote가 없음');
  return quote;
}

function blocksOf(quote: Blockquote): { element: string; text: string }[] {
  return quote.children.map((child: RootContent) => ({ element: child.data?.hName ?? child.type, text: toString(child) }));
}

describe('remarkCallout', () => {
  it('type과 접힌 상태를 callout element에 남기고 제목을 따로 둔다', () => {
    const quote = quoteOf(['> [!info]- 참고: 자주 쓰는 용어', '> - **SNI**: 도메인 이름을 함께 보내는 기능'].join('\n'));

    expect(quote.data).toMatchObject({ hName: CALLOUT_ELEMENT, hProperties: { type: 'info', fold: 'collapsed' } });
    expect(blocksOf(quote)).toEqual([
      { element: CALLOUT_TITLE_ELEMENT, text: '참고: 자주 쓰는 용어' },
      { element: 'list', text: 'SNI: 도메인 이름을 함께 보내는 기능' },
    ]);
  });

  it('`+`는 펼친 상태로, 접기 표시가 없으면 접기 상태 없이 둔다', () => {
    expect(quoteOf('> [!tip]+ 펼침').data?.hProperties).toEqual({ type: 'tip', fold: 'expanded' });
    expect(quoteOf('> [!tip] 고정').data?.hProperties).toEqual({ type: 'tip' });
  });

  it('type은 대소문자를 가리지 않는다', () => {
    expect(quoteOf('> [!WARNING] 주의').data?.hProperties).toEqual({ type: 'warning' });
  });

  it('빈 줄 없이 이어진 본문 줄은 제목과 다른 문단이 된다', () => {
    const quote = quoteOf(['> [!note] 재시도 정책', '> 재시도는 **지수 백오프**로 한다.'].join('\n'));

    expect(blocksOf(quote)).toEqual([
      { element: CALLOUT_TITLE_ELEMENT, text: '재시도 정책' },
      { element: 'paragraph', text: '재시도는 지수 백오프로 한다.' },
    ]);
  });

  it('제목 안의 서식은 제목에 남는다', () => {
    const [title] = quoteOf(['> [!tip] **캐시** 비우기', '> 본문'].join('\n')).children;

    expect(toString(title)).toBe('캐시 비우기');
    expect(title.type === 'paragraph' && title.children.some((child) => child.type === 'strong')).toBe(true);
  });

  it('제목이 없어도 type label이 설 빈 제목을 남긴다', () => {
    const quote = quoteOf(['> [!NOTE]', '> 이 섹션은 미구현임'].join('\n'));

    expect(blocksOf(quote)).toEqual([
      { element: CALLOUT_TITLE_ELEMENT, text: '' },
      { element: 'paragraph', text: '이 섹션은 미구현임' },
    ]);
  });

  it('제목만 있는 callout의 블록 표시는 제목의 type을 지우지 않는다', () => {
    const quote = quoteOf(['> [!note] 제목만', '> ^c58057'].join('\n'));

    expect(quote.data?.hProperties).toEqual({ type: 'note', id: 'block-c58057' });
    expect(quote.children[0].data?.hProperties).toEqual({ type: 'note' });
  });

  it('인용 안에 중첩한 callout도 callout이 된다', () => {
    const quote = quoteOf(['> [!example] 바깥', '>', '> > [!question]- 안쪽', '> > 답'].join('\n'));

    expect(quote.children[1].data).toMatchObject({ hName: CALLOUT_ELEMENT, hProperties: { type: 'question', fold: 'collapsed' } });
  });

  it('첫 줄 맨 앞이 아닌 표시는 일반 인용의 글자로 둔다', () => {
    const quote = quoteOf('> 문법은 [!note]로 쓴다');

    expect(quote.data?.hName).toBeUndefined();
    expect(toString(quote)).toBe('문법은 [!note]로 쓴다');
  });
});
