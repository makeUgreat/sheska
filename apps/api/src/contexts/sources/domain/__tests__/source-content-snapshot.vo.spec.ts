import { SourceContentSnapshot } from '@contexts/sources/domain';
import { describe, expect, it } from 'vitest';

const byteSize = (content: string): number =>
  new TextEncoder().encode(content).length;

describe('SourceContentSnapshot', () => {
  describe('create', () => {
    it('유효한 원문 snapshot을 생성하고 size를 계산하며 fingerprint를 trim한다', () => {
      const content = '# Source note';

      const snapshot = SourceContentSnapshot.create({
        content,
        fingerprint: ' fingerprint-1 ',
      });

      expect(snapshot.unpack()).toEqual({
        content,
        fingerprint: 'fingerprint-1',
        size: byteSize(content),
      });
    });

    it('빈 content와 size 0을 허용한다', () => {
      const snapshot = SourceContentSnapshot.create({
        content: '',
        fingerprint: 'empty-fingerprint',
      });

      expect(snapshot.unpack().size).toBe(0);
    });

    it('fingerprint가 공백뿐이면 throw한다', () => {
      expect(() =>
        SourceContentSnapshot.create({
          content: '# Source note',
          fingerprint: ' ',
        }),
      ).toThrow('Source fingerprint cannot be empty');
    });
  });

  describe('restore', () => {
    it('content byte size와 size가 다르면 throw한다', () => {
      expect(() =>
        SourceContentSnapshot.restore({
          content: '안녕',
          fingerprint: 'fingerprint-1',
          size: 2,
        }),
      ).toThrow('Source size must match content byte size');
    });
  });
});
