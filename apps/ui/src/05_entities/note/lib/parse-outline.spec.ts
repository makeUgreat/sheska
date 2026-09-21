import { describe, it, expect } from 'vitest';
import { parseOutline } from './parse-outline';

describe('parseOutline', () => {
  it('본문이 비어 있으면 heading을 만들지 않는다', () => {
    expect(parseOutline('')).toEqual([]);
  });

  it('heading의 depth, text, source line을 함께 담는다', () => {
    expect(parseOutline('intro\n\n## Layers\n')).toEqual([
      { depth: 2, text: 'Layers', id: 'layers', line: 3 },
    ]);
  });

  it('h4 이상은 outline에 넣지 않는다', () => {
    expect(parseOutline('#### Too Deep')).toEqual([]);
  });

  it('fenced code block 안의 #는 heading으로 보지 않는다', () => {
    const body = ['```sh', '# not a heading', '```', '## Real'].join('\n');

    expect(parseOutline(body).map((heading) => heading.text)).toEqual(['Real']);
  });

  it('물결 fence도 code block으로 인식한다', () => {
    const body = ['~~~', '# not a heading', '~~~'].join('\n');

    expect(parseOutline(body)).toEqual([]);
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
