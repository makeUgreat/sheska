import { describe, it, expect } from 'vitest';
import { parseOutline } from './parse-outline';

describe('parseOutline', () => {
  it('본문이 비어 있으면 heading을 만들지 않는다', () => {
    expect(parseOutline('')).toEqual([]);
  });

  it('heading의 depth, text, id를 함께 담는다', () => {
    expect(parseOutline('intro\n\n## Layers\n')).toEqual([
      { depth: 2, text: 'Layers', id: 'layers' },
    ]);
  });

  it('h4 이하 단계도 문서 구조이므로 outline에 넣는다', () => {
    const body = ['#### Deep', '###### Deepest'].join('\n');

    expect(parseOutline(body)).toEqual([
      { depth: 4, text: 'Deep', id: 'deep' },
      { depth: 6, text: 'Deepest', id: 'deepest' },
    ]);
  });

  it('fenced code block 안의 #는 heading으로 보지 않는다', () => {
    const body = ['```sh', '# not a heading', '```', '## Real'].join('\n');

    expect(parseOutline(body).map((heading) => heading.text)).toEqual(['Real']);
  });

  it('물결 fence도 code block으로 인식한다', () => {
    const body = ['~~~', '# not a heading', '~~~'].join('\n');

    expect(parseOutline(body)).toEqual([]);
  });

  it('다른 종류의 fence는 code block을 닫지 않는다', () => {
    const body = ['~~~', '```', '# not a heading', '~~~', '## Real'].join('\n');

    expect(parseOutline(body).map((heading) => heading.text)).toEqual(['Real']);
  });

  it('여는 fence보다 짧은 fence는 code block을 닫지 않는다', () => {
    const body = ['````', '```', '# not a heading', '````', '## Real'].join(
      '\n',
    );

    expect(parseOutline(body).map((heading) => heading.text)).toEqual(['Real']);
  });

  it('밑줄 표기 heading도 outline에 넣는다', () => {
    expect(parseOutline('Title\n=====')).toEqual([
      { depth: 1, text: 'Title', id: 'title' },
    ]);
  });

  it('heading text에서 inline 문법 기호와 닫는 #를 뺀다', () => {
    expect(parseOutline('## **굵은** `code` ##')[0].text).toBe('굵은 code');
  });

  it('heading 안의 wiki link는 본문처럼 label로 읽는다', () => {
    expect(parseOutline('## [[FSD|레이어]] 소개')[0].text).toBe('레이어 소개');
  });

  it('인용문 안의 heading은 outline에 넣지 않는다', () => {
    expect(parseOutline('> ## quoted')).toEqual([]);
  });

  it('slug가 겹치지 않으면 slug를 그대로 id로 쓴다', () => {
    const body = ['## Setup', '## Usage'].join('\n');

    expect(parseOutline(body).map((heading) => heading.id)).toEqual([
      'setup',
      'usage',
    ]);
  });

  it('slug가 겹치면 source line을 붙여 id를 구분한다', () => {
    const body = ['## Setup', 'body', '## Setup'].join('\n');

    expect(parseOutline(body).map((heading) => heading.id)).toEqual([
      'setup-1',
      'setup-3',
    ]);
  });
});
