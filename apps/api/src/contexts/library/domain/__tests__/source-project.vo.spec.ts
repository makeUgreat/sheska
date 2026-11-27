import { describe, expect, it } from 'vitest';
import { type SourceFrontmatterProps } from '../source-frontmatter.vo';
import { SourceProject } from '../source-project.vo';

describe('SourceProject', () => {
  describe('parse', () => {
    it('문자열이면 그 값으로 관련 프로젝트를 만든다', () => {
      const project = SourceProject.parse({ project: 'sheska' });

      expect(project.unpack()).toEqual({ kind: 'related', name: 'sheska' });
    });

    // nocap: library-source-12
    it.each([
      ['대문자를', 'Sheska', 'sheska'],
      ['앞뒤 공백을', '  Home-Cluster  ', 'home-cluster'],
    ])('%s 정규화한 값으로 저장한다', (_label, value, name) => {
      expect(SourceProject.parse({ project: value }).unpack()).toEqual({ kind: 'related', name });
    });

    it('화면이 모르는 이름도 그대로 받는다', () => {
      expect(SourceProject.parse({ project: 'sheksa' }).unpack()).toEqual({ kind: 'related', name: 'sheksa' });
    });

    // nocap: library-source-11
    it.each<[string, SourceFrontmatterProps]>([
      ['키가 없으면', { title: 'Retry' }],
      ['값이 비어 있으면', { project: null }],
      ['빈 문자열이면', { project: '' }],
      ['공백뿐이면', { project: '   ' }],
    ])('%s 관련 프로젝트가 없다', (_label, frontmatter) => {
      expect(SourceProject.parse(frontmatter).unpack()).toEqual({ kind: 'none' });
    });

    // nocap: library-source-11
    it.each<[string, SourceFrontmatterProps]>([
      ['목록', { project: ['sheska', 'siru'] }],
      ['숫자', { project: 3 }],
      ['boolean', { project: true }],
      ['객체', { project: { name: 'sheska' } }],
    ])('%s이면 `frontmatter.project`를 짚어 거부한다', (_label, frontmatter) => {
      expect(() => SourceProject.parse(frontmatter)).toThrow(
        expect.objectContaining({
          kind: 'validation_failed',
          code: 'source.invalid_project',
          details: { fields: [{ path: 'frontmatter.project', messages: [expect.any(String)] }] },
        }),
      );
    });
  });

  describe('of', () => {
    it.each([
      ['이름이 비어 있으면', { kind: 'related', name: '' } as const],
      ['이름에 대문자가 있으면', { kind: 'related', name: 'Sheska' } as const],
      ['이름 앞뒤에 공백이 있으면', { kind: 'related', name: ' sheska ' } as const],
    ])('%s 불변식 위반으로 거부한다', (_label, props) => {
      expect(() => SourceProject.of(props)).toThrow(
        expect.objectContaining({ kind: 'invariant_violation', code: 'source.invalid_project' }),
      );
    });
  });
});
