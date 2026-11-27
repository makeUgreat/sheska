import { describe, expect, it } from 'vitest';
import { type SourceFrontmatterProps } from '../source-frontmatter.vo';
import { SourceProject, type SourceProjectProps } from '../source-project.vo';

describe('SourceProject', () => {
  describe('parse', () => {
    // nocap: library-source-11
    it.each(['sheska', 'siru', 'nocap', 'home-cluster'])('정해 둔 slug `%s`이면 그 프로젝트와 관련된 글이다', (slug) => {
      const project = SourceProject.parse({ project: slug });

      expect(project.unpack()).toEqual({ kind: 'related', slug });
    });

    // nocap: library-source-11
    it.each<[string, SourceFrontmatterProps]>([
      ['키가 없으면', { title: 'Retry' }],
      ['값이 비어 있으면', { project: null }],
    ])('%s 관련 프로젝트가 없다', (_label, frontmatter) => {
      expect(SourceProject.parse(frontmatter).unpack()).toEqual({ kind: 'none' });
    });

    // nocap: library-source-11
    it.each<[string, SourceFrontmatterProps]>([
      ['정해 두지 않은 slug', { project: 'sheksa' }],
      ['대문자가 섞인 slug', { project: 'Sheska' }],
      ['앞뒤에 공백이 있는 slug', { project: ' sheska ' }],
      ['빈 문자열', { project: '' }],
      ['목록', { project: ['sheska', 'siru'] }],
      ['숫자', { project: 3 }],
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
    it('정해 두지 않은 slug이면 불변식 위반으로 거부한다', () => {
      const props = { kind: 'related', slug: 'sheksa' } as unknown as SourceProjectProps;

      expect(() => SourceProject.of(props)).toThrow(
        expect.objectContaining({ kind: 'invariant_violation', code: 'source.invalid_project' }),
      );
    });
  });
});
