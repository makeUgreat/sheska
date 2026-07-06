import { Source } from '@contexts/sources/domain';
import { describe, expect, it } from 'vitest';

const byteSize = (content: string): number =>
  new TextEncoder().encode(content).length;

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('Source', () => {
  describe('create', () => {
    it('유효한 source 원문 snapshot으로 source를 생성한다', () => {
      const content = '# Source note';

      const source = Source.create({
        externalSourceId: ' Notes/source.md ',
        content,
        fingerprint: ' fingerprint-1 ',
      });
      const props = source.getProps();

      expect(props.id).toMatch(UUID_V7_PATTERN);
      expect(props.externalSourceId.unpack()).toBe('Notes/source.md');
      expect(props.contentSnapshot.unpack()).toEqual({
        content,
        fingerprint: 'fingerprint-1',
        size: byteSize(content),
      });
    });

    it('빈 content와 size 0을 허용한다', () => {
      const source = Source.create({
        externalSourceId: 'empty-note',
        content: '',
        fingerprint: 'empty-fingerprint',
      });

      expect(source.getProps().contentSnapshot.unpack().size).toBe(0);
    });

    it('externalSourceId가 공백뿐이면 throw한다', () => {
      expect(() =>
        Source.create({
          externalSourceId: ' ',
          content: '# Source note',
          fingerprint: 'fingerprint-1',
        }),
      ).toThrow('External source id cannot be empty');
    });

    it('fingerprint가 공백뿐이면 throw한다', () => {
      expect(() =>
        Source.create({
          externalSourceId: 'Notes/source.md',
          content: '# Source note',
          fingerprint: ' ',
        }),
      ).toThrow('Source fingerprint cannot be empty');
    });
  });

  describe('restore', () => {
    it('저장된 source id를 그대로 보존한다', () => {
      const content = '# Source note';

      const source = Source.restore({
        id: ' source-1 ',
        externalSourceId: 'Notes/source.md',
        content,
        fingerprint: 'fingerprint-1',
        size: byteSize(content),
      });

      expect(source.id).toBe(' source-1 ');
    });

    it('content byte size와 저장된 size가 다르면 throw한다', () => {
      expect(() =>
        Source.restore({
          id: 'source-1',
          externalSourceId: 'Notes/source.md',
          content: '안녕',
          fingerprint: 'fingerprint-1',
          size: 2,
        }),
      ).toThrow('Source size must match content byte size');
    });
  });

  describe('syncContentSnapshot', () => {
    it('같은 fingerprint이면 내용을 바꾸지 않고 changed false를 반환한다', () => {
      const source = Source.restore({
        id: 'source-1',
        externalSourceId: 'Notes/source.md',
        content: '# Old note',
        fingerprint: 'fingerprint-1',
        size: byteSize('# Old note'),
      });

      const { source: applied, changed } = source.syncContentSnapshot({
        content: '# New note',
        fingerprint: ' fingerprint-1 ',
      });
      const contentSnapshot = applied.getProps().contentSnapshot.unpack();

      expect(contentSnapshot.content).toBe('# Old note');
      expect(changed).toBe(false);
    });

    it('다른 fingerprint이면 원문 snapshot을 갱신하고 changed true를 반환한다', () => {
      const source = Source.restore({
        id: 'source-1',
        externalSourceId: 'Notes/source.md',
        content: '# Old note',
        fingerprint: 'fingerprint-1',
        size: byteSize('# Old note'),
      });

      const content = '# New note';
      const { source: applied, changed } = source.syncContentSnapshot({
        content,
        fingerprint: ' fingerprint-2 ',
      });
      const props = applied.getProps();

      expect(props.contentSnapshot.unpack()).toEqual({
        content,
        fingerprint: 'fingerprint-2',
        size: byteSize(content),
      });
      expect(changed).toBe(true);
    });
  });
});
