import { describe, expect, it } from 'vitest';
import { KnowledgeFolder } from '../knowledge-folder.vo';

describe('KnowledgeFolder', () => {
  it('폴더 구분자까지 붙인 경로 prefix를 만든다', () => {
    expect(KnowledgeFolder.of('09_Knowledge').pathPrefix).toBe('09_Knowledge/');
  });

  it('앞뒤 공백과 슬래시를 떼어 낸다', () => {
    expect(KnowledgeFolder.of(' /09_Knowledge/ ').pathPrefix).toBe(
      '09_Knowledge/',
    );
  });

  it('비어 있으면 throw한다', () => {
    expect(() => KnowledgeFolder.of(' / ')).toThrow(
      'Knowledge folder cannot be empty',
    );
  });
});
