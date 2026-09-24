import { describe, it, expect } from 'vitest';
import { parseWikiLink } from './parse-wiki-link';

describe('parseWikiLink', () => {
  it('label이 없으면 target을 label로 쓴다', () => {
    expect(parseWikiLink('FSD')).toEqual({
      target: 'FSD',
      anchor: null,
      label: 'FSD',
    });
  });

  it('pipe가 있으면 뒤쪽 표기를 label로 사용한다', () => {
    expect(parseWikiLink('feature-sliced-design|FSD')).toEqual({
      target: 'feature-sliced-design',
      anchor: null,
      label: 'FSD',
    });
  });

  it('heading anchor는 target에서 떼어내고 label에서도 제외한다', () => {
    expect(parseWikiLink('FSD#레이어 모델')).toEqual({
      target: 'FSD',
      anchor: { kind: 'heading', text: '레이어 모델' },
      label: 'FSD',
    });
  });

  it('target 없는 block reference는 같은 노트를 가리키게 둔다', () => {
    expect(parseWikiLink('#^c58057|의존성 배열')).toEqual({
      target: null,
      anchor: { kind: 'block', id: 'c58057' },
      label: '의존성 배열',
    });
  });

  it('label이 없는 block reference는 표시를 그대로 label로 쓴다', () => {
    expect(parseWikiLink('#^c58057')).toEqual({
      target: null,
      anchor: { kind: 'block', id: 'c58057' },
      label: '^c58057',
    });
  });

  it('표 안에서 escape된 pipe도 label 구분자로 읽는다', () => {
    expect(parseWikiLink('20260829133959\\|커널 스레드')).toEqual({
      target: '20260829133959',
      anchor: null,
      label: '커널 스레드',
    });
  });
});
