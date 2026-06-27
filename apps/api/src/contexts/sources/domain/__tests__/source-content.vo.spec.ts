import { SourceContent } from '@contexts/sources/domain';
import { describe, expect, it } from 'vitest';

describe('SourceContent', () => {
  describe('hasByteSize', () => {
    it('UTF-8 byte size가 같으면 true를 반환한다', () => {
      const result = SourceContent.of('안녕');

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.hasByteSize(6)).toBe(true);
      }
    });

    it('UTF-8 byte size가 다르면 false를 반환한다', () => {
      const result = SourceContent.of('안녕');

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.hasByteSize(2)).toBe(false);
      }
    });
  });
});
