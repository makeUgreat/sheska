import { SourceDocumentPath } from '@contexts/source-documents/domain';
import { describe, expect, it } from 'vitest';

describe('SourceDocumentPath', () => {
  describe('of', () => {
    it('상대 Markdown 경로를 정규화한다', () => {
      const result = SourceDocumentPath.of(' Notes\\Daily//today.md ');

      expect(result.isOk()).toBe(true);

      if (result.isOk()) {
        expect(result.value.value).toBe('Notes/Daily/today.md');
      }
    });

    it('절대 경로이면 실패 Result를 반환한다', () => {
      const result = SourceDocumentPath.of('/Users/me/source/note.md');

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('source_document.path_invalid');
      }
    });

    it('마크다운 문서 경로가 아니면 실패 Result를 반환한다', () => {
      const result = SourceDocumentPath.of('Notes/canvas.canvas');

      expect(result.isErr()).toBe(true);

      if (result.isErr()) {
        expect(result.error.code).toBe('source_document.path_not_markdown');
      }
    });
  });
});
