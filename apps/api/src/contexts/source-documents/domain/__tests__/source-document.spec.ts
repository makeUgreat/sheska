import {
  SourceDocument,
  SourceDocumentMetadata,
} from '@contexts/source-documents/domain';
import { describe, expect, it } from 'vitest';

describe('SourceDocument', () => {
  describe('restore', () => {
    it('유효한 값으로 source document를 복원한다', () => {
      const metadata = createMetadata({
        title: 'Source note',
        publish: true,
      });

      const result = SourceDocument.restore({
        id: '  doc-1  ',
        props: {
          sourceId: '  local-markdown  ',
          path: ' Notes\\source.md ',
          contentHash: '  hash-1  ',
          body: '# Source note',
          metadata,
        },
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.isStoredAt('Notes/source.md')).toBe(true);
        expect(result.value.hasContentHash('hash-1')).toBe(true);
        expect(result.value.isPublishable()).toBe(true);
      }
    });

    it('출처 ID(sourceId)가 공백뿐이면 실패 Result를 반환한다', () => {
      const result = SourceDocument.restore({
        id: 'doc-1',
        props: {
          sourceId: ' ',
          path: 'Notes/source.md',
          contentHash: 'hash-1',
          body: '# Source note',
          metadata: createMetadata({}),
        },
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('source_document.source_id_empty');
      }
    });

    it('내용 hash(contentHash)가 공백뿐이면 실패 Result를 반환한다', () => {
      const result = SourceDocument.restore({
        id: 'doc-1',
        props: {
          sourceId: 'local-markdown',
          path: 'Notes/source.md',
          contentHash: ' ',
          body: '# Source note',
          metadata: createMetadata({}),
        },
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('source_document.content_hash_empty');
      }
    });
  });
});

function createMetadata(
  frontmatter: Record<string, unknown>,
): SourceDocumentMetadata {
  const metadata = SourceDocumentMetadata.fromFrontmatter(frontmatter);

  if (metadata.isErr()) {
    throw new Error(metadata.error.message);
  }

  return metadata.value;
}
