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

      const result = Source.create({
        externalSourceId: ' Notes/source.md ',
        content,
        contentHash: ' hash-1 ',
        size: byteSize(content),
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const props = result.value.getProps();

        expect(props.id).toMatch(UUID_V7_PATTERN);
        expect(props.externalSourceId.value).toBe('Notes/source.md');
        expect(props.contentSnapshot.value).toEqual({
          content,
          contentHash: 'hash-1',
          size: byteSize(content),
        });
      }
    });

    it('빈 content와 size 0을 허용한다', () => {
      const result = Source.create({
        externalSourceId: 'empty-note',
        content: '',
        contentHash: 'empty-hash',
        size: 0,
      });

      expect(result.isOk()).toBe(true);
    });

    it('externalSourceId가 공백뿐이면 실패 Result를 반환한다', () => {
      const result = Source.create({
        externalSourceId: ' ',
        content: '# Source note',
        contentHash: 'hash-1',
        size: byteSize('# Source note'),
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('external_source.id_empty');
      }
    });

    it('contentHash가 공백뿐이면 실패 Result를 반환한다', () => {
      const result = Source.create({
        externalSourceId: 'Notes/source.md',
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
      const result = Source.create({
        externalSourceId: 'Notes/source.md',
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

  describe('restore', () => {
    it('저장된 source id로 source를 복원한다', () => {
      const content = '# Source note';

      const result = Source.restore({
        id: ' source-1 ',
        externalSourceId: 'Notes/source.md',
        content,
        contentHash: 'hash-1',
        size: byteSize(content),
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.id).toBe('source-1');
      }
    });

    it('source id가 공백뿐이면 실패 Result를 반환한다', () => {
      const result = Source.restore({
        id: ' ',
        externalSourceId: 'Notes/source.md',
        content: '# Source note',
        contentHash: 'hash-1',
        size: byteSize('# Source note'),
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('entity.id_empty');
      }
    });
  });

  describe('syncContentSnapshot', () => {
    it('같은 contentHash이면 skipped 상태를 반환하고 내용을 바꾸지 않는다', () => {
      const result = Source.create({
        externalSourceId: 'Notes/source.md',
        content: '# Old note',
        contentHash: 'hash-1',
        size: byteSize('# Old note'),
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const applied = result.value.syncContentSnapshot({
          content: '# New note',
          contentHash: ' hash-1 ',
          size: byteSize('# New note'),
        });

        expect(applied.isOk()).toBe(true);

        if (applied.isOk()) {
          expect(applied.value.status).toBe('skipped');
          expect(
            applied.value.source.getProps().contentSnapshot.value.content,
          ).toBe('# Old note');
        }
      }
    });

    it('다른 contentHash이면 updated 상태를 반환하고 원문 snapshot을 갱신한다', () => {
      const result = Source.create({
        externalSourceId: 'Notes/source.md',
        content: '# Old note',
        contentHash: 'hash-1',
        size: byteSize('# Old note'),
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        const content = '# New note';
        const applied = result.value.syncContentSnapshot({
          content,
          contentHash: ' hash-2 ',
          size: byteSize(content),
        });

        expect(applied.isOk()).toBe(true);

        if (applied.isOk()) {
          const props = applied.value.source.getProps();

          expect(applied.value.status).toBe('updated');
          expect(props.contentSnapshot.value).toEqual({
            content,
            contentHash: 'hash-2',
            size: byteSize(content),
          });
        }
      }
    });
  });
});
