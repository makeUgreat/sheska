import { SourceContent } from '@contexts/sources/domain';
import { describe, expect, it } from 'vitest';

describe('SourceContent', () => {
  describe('hasByteSize', () => {
    it('UTF-8 byte size가 같으면 true를 반환한다', () => {
      const sourceContent = SourceContent.of('안녕');

      expect(sourceContent.hasByteSize(6)).toBe(true);
    });

    it('UTF-8 byte size가 다르면 false를 반환한다', () => {
      const sourceContent = SourceContent.of('안녕');

      expect(sourceContent.hasByteSize(2)).toBe(false);
    });
  });
});
