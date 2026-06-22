import { SourceDocumentMetadata } from '@contexts/source-documents/domain';
import { describe, expect, it } from 'vitest';

describe('SourceDocumentMetadata', () => {
  describe('fromFrontmatter', () => {
    it('게시 metadata를 정규화한다', () => {
      const result = SourceDocumentMetadata.fromFrontmatter({
        title: '  My note  ',
        publish: true,
      });

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.hasTitle('My note')).toBe(true);
        expect(result.value.isMarkedForPublishing()).toBe(true);
      }
    });

    it('비공개 metadata는 title 없이도 허용한다', () => {
      const result = SourceDocumentMetadata.fromFrontmatter();

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.isMarkedForPublishing()).toBe(false);
        expect(result.value.hasTitle('')).toBe(true);
      }
    });

    it('게시 metadata에 title이 없으면 실패 Result를 반환한다', () => {
      const result = SourceDocumentMetadata.fromFrontmatter({
        publish: true,
      });

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe(
          'source_document.publish_metadata_incomplete',
        );
        expect((result.error.details as { fields: string[] }).fields).toEqual([
          'title',
        ]);
      }
    });

    it('알 수 없는 frontmatter field는 무시한다', () => {
      const result = SourceDocumentMetadata.fromFrontmatter({
        unknown: () => 'not-domain-metadata',
      });

      expect(result.isOk()).toBe(true);
    });
  });
});
