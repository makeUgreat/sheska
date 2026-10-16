import { describe, expect, it } from 'vitest';
import { parseLibraryConfig } from '../library.config';

describe('parseLibraryConfig', () => {
  it('지식 폴더를 typed config로 반환한다', () => {
    expect(
      parseLibraryConfig({ LIBRARY_KNOWLEDGE_FOLDER: ' 09_Knowledge ' }),
    ).toEqual({ knowledgeFolder: '09_Knowledge' });
  });

  it('LIBRARY_KNOWLEDGE_FOLDER가 없으면 validation에 실패한다', () => {
    expect(() => parseLibraryConfig({})).toThrow();
  });

  it('LIBRARY_KNOWLEDGE_FOLDER가 비어 있으면 validation에 실패한다', () => {
    expect(() =>
      parseLibraryConfig({ LIBRARY_KNOWLEDGE_FOLDER: '  ' }),
    ).toThrow();
  });
});
