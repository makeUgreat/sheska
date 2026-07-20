import { describe, expect, it } from 'vitest';
import { RecursiveCharacterChunker } from '../recursive-character.chunker';

describe('RecursiveCharacterChunker', () => {
  describe('기본 동작', () => {
    it('빈 문자열은 빈 배열을 반환한다', () => {
      const chunker = new RecursiveCharacterChunker(100, 10);
      expect(chunker.chunk('')).toEqual([]);
    });

    it('chunkSize 이하인 텍스트는 단일 청크로 반환한다', () => {
      const chunker = new RecursiveCharacterChunker(100, 10);
      const result = chunker.chunk('short text');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ content: 'short text', index: 0 });
    });

    it('index는 0-based 순서로 부여된다', () => {
      const chunker = new RecursiveCharacterChunker(7, 0);
      const result = chunker.chunk('abc\n\ndef\n\nghi');

      result.forEach((chunk, i) => {
        expect(chunk.index).toBe(i);
      });
    });
  });

  describe('경계 케이스', () => {
    it('text length가 chunkSize와 정확히 같으면 분할하지 않는다', () => {
      const chunker = new RecursiveCharacterChunker(10, 0);

      const result = chunker.chunk('1234567890');

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('1234567890');
    });

    it('text length가 chunkSize보다 1 크면 분할한다', () => {
      const chunker = new RecursiveCharacterChunker(10, 0);

      const result = chunker.chunk('12345678901');

      expect(result.length).toBeGreaterThan(1);
    });

    it('단일 문자 텍스트를 처리한다', () => {
      const chunker = new RecursiveCharacterChunker(100, 10);

      const result = chunker.chunk('a');

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('a');
    });

    it('chunkOverlap이 0이면 청크 간 중복이 없다', () => {
      const chunker = new RecursiveCharacterChunker(5, 0);
      const result = chunker.chunk('abcdefghij');

      const allContent = result.map((c) => c.content).join('');
      expect(allContent).toBe('abcdefghij');
    });
  });

  describe('구분자 분할 체인', () => {
    it('\\n\\n 단락 기준으로 분할한다', () => {
      const chunker = new RecursiveCharacterChunker(7, 0);
      const result = chunker.chunk('abc\n\ndef\n\nghi');

      expect(result.map((c) => c.content)).toEqual(['abc', 'def', 'ghi']);
    });

    it('\\n\\n이 없으면 \\n 기준으로 분할한다', () => {
      const chunker = new RecursiveCharacterChunker(10, 0);
      const result = chunker.chunk('line one\nline two\nline three');

      expect(result.map((c) => c.content)).toEqual([
        'line one',
        'line two',
        'line three',
      ]);
    });

    it('줄바꿈이 없으면 공백 기준으로 분할한다', () => {
      const chunker = new RecursiveCharacterChunker(6, 0);
      const result = chunker.chunk('hello world foo');

      expect(result.map((c) => c.content)).toEqual(['hello', 'world', 'foo']);
    });

    it('연속된 \\n\\n 사이의 빈 문자열은 청크에 포함되지 않는다', () => {
      // 'para one\n\n\n\npara two' = 20자, chunkSize=12로 분할 발생
      const chunker = new RecursiveCharacterChunker(12, 0);
      const result = chunker.chunk('para one\n\n\n\npara two');

      expect(result.every((c) => c.content !== '')).toBe(true);
      expect(result.map((c) => c.content)).toContain('para one');
      expect(result.map((c) => c.content)).toContain('para two');
    });

    it('단락들이 chunkSize 내에 들어오면 합쳐서 하나의 청크로 반환한다', () => {
      const chunker = new RecursiveCharacterChunker(50, 0);
      const result = chunker.chunk('short\n\nalso short');

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('short\n\nalso short');
    });
  });

  describe('오버랩', () => {
    it('문자 단위 분할 시 오버랩 내용이 다음 청크 앞부분에 포함된다', () => {
      const chunker = new RecursiveCharacterChunker(8, 3);
      const result = chunker.chunk('abcdefghij');

      expect(result[0].content).toBe('abcdefgh');
      expect(result[1].content).toBe('fghij');
      // 앞 청크의 마지막 3글자가 다음 청크 시작에 포함됨
      const overlapFromFirst = result[0].content.slice(-3);
      expect(result[1].content.startsWith(overlapFromFirst)).toBe(true);
    });

    it('단락 분할 시 오버랩이 적용되어 앞 청크 내용이 다음 청크에 포함된다', () => {
      const chunker = new RecursiveCharacterChunker(15, 5);
      const text = 'abcde\n\nfghij\n\nklmno';
      const result = chunker.chunk(text);

      expect(result.length).toBeGreaterThan(1);
      // 각 청크 시작이 이전 청크 끝 내용을 포함해야 함
      for (let i = 1; i < result.length; i++) {
        const prevEnd = result[i - 1].content.slice(-5);
        expect(result[i].content).toContain(prevEnd);
      }
    });
  });

  describe('문자 단위 분할 fallback', () => {
    it('구분자로 나눌 수 없는 긴 단어는 문자 단위로 분할한다', () => {
      const chunker = new RecursiveCharacterChunker(5, 0);
      const result = chunker.chunk('abcdefghij');

      expect(result.map((c) => c.content)).toEqual(['abcde', 'fghij']);
    });

    it('chunkSize보다 훨씬 긴 단어도 모든 문자를 보존한다', () => {
      const chunker = new RecursiveCharacterChunker(3, 0);
      const result = chunker.chunk('abcdefghi');

      expect(result.map((c) => c.content).join('')).toBe('abcdefghi');
      expect(result).toHaveLength(3);
    });

    it('chunkOverlap이 chunkSize에 근접해도 무한 루프 없이 종료한다', () => {
      const chunker = new RecursiveCharacterChunker(5, 4);

      expect(() => chunker.chunk('abcdefghij')).not.toThrow();
    });
  });
});
