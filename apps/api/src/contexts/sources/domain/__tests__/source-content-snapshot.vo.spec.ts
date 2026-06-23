import { SourceContentSnapshot } from '@contexts/sources/domain';
import { describe, expect, it } from 'vitest';

const byteSize = (content: string): number =>
  new TextEncoder().encode(content).length;

describe('SourceContentSnapshot', () => {
  describe('of', () => {
    it('유효한 원문 snapshot을 생성하고 contentHash를 trim한다', () => {
      const content = '# Source note';

      const result = SourceContentSnapshot.of({
        content,
        contentHash: ' hash-1 ',
        size: byteSize(content),
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.value).toEqual({
          content,
          contentHash: 'hash-1',
          size: byteSize(content),
        });
      }
    });

    it('빈 content와 size 0을 허용한다', () => {
      const result = SourceContentSnapshot.of({
        content: '',
        contentHash: 'empty-hash',
        size: 0,
      });

      expect(result.isOk()).toBe(true);
    });

    it('contentHash가 공백뿐이면 실패 Result를 반환한다', () => {
      const result = SourceContentSnapshot.of({
        content: '# Source note',
        contentHash: ' ',
        size: byteSize('# Source note'),
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('source.content_hash_empty');
      }
    });

    it('content byte size와 size가 다르면 실패 Result를 반환한다', () => {
      const result = SourceContentSnapshot.of({
        content: '안녕',
        contentHash: 'hash-1',
        size: 2,
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('source.size_mismatch');
      }
    });
  });
});
