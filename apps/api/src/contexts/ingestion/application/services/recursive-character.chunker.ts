import { Injectable } from '@nestjs/common';

export interface Chunk {
  readonly content: string;
  readonly index: number;
}

export const DEFAULT_CHUNK_SIZE = 6000;
export const DEFAULT_CHUNK_OVERLAP = 600;
export const DEFAULT_SEPARATORS = ['\n\n', '\n', ' ', ''];

const CHAR_SPLIT_SENTINEL = [''];
const isNonEmpty = (s: string) => s.length > 0;

export interface RecursiveCharacterChunkerOptions {
  chunkSize: number;
  chunkOverlap: number;
  separators: string[];
}

@Injectable()
export class RecursiveCharacterChunker {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  private readonly separators: string[];

  constructor(options: RecursiveCharacterChunkerOptions) {
    this.chunkSize = options.chunkSize;
    this.chunkOverlap = options.chunkOverlap;
    this.separators = options.separators;
  }

  chunk(text: string): Chunk[] {
    const rawChunks = this.splitText(text, this.separators);
    return rawChunks.map((content, index) => ({ content, index }));
  }

  private splitText(text: string, separators: string[]): string[] {
    if (text.length === 0) return [];
    if (text.length <= this.chunkSize) return [text];

    const [separator, ...remainingSeparators] = separators;

    if (this.isSeparatorExhausted(separator)) {
      return this.splitByCharCount(text);
    }

    const parts = text.split(separator).filter(isNonEmpty);
    let fittedParts: string[] = [];
    const result: string[] = [];

    for (const part of parts) {
      if (part.length <= this.chunkSize) {
        fittedParts.push(part);
      } else {
        if (fittedParts.length > 0) {
          result.push(...this.mergeWithOverlap(fittedParts, separator));
          fittedParts = [];
        }
        result.push(...this.splitWithFinerSeparator(part, remainingSeparators));
      }
    }

    if (fittedParts.length > 0) {
      result.push(...this.mergeWithOverlap(fittedParts, separator));
    }

    return result;
  }

  private mergeWithOverlap(splits: string[], separator: string): string[] {
    const chunks: string[] = [];
    const current: string[] = [];

    for (const split of splits) {
      const projectedChunk =
        current.length === 0
          ? split
          : current.join(separator) + separator + split;

      if (projectedChunk.length > this.chunkSize && current.length > 0) {
        chunks.push(current.join(separator));
        this.trimToOverlapBudget(current, separator);
      }

      current.push(split);
    }

    if (current.length > 0) {
      chunks.push(current.join(separator));
    }

    return chunks;
  }

  private splitWithFinerSeparator(
    text: string,
    remainingSeparators: string[],
  ): string[] {
    return this.splitText(
      text,
      remainingSeparators.length > 0
        ? remainingSeparators
        : CHAR_SPLIT_SENTINEL,
    );
  }

  private trimToOverlapBudget(current: string[], separator: string): void {
    while (current.length > 0) {
      const remaining = current.join(separator);
      if (remaining.length > this.chunkOverlap) {
        current.shift();
      } else {
        break;
      }
    }
  }

  private isSeparatorExhausted(separator: string | undefined): boolean {
    return separator === undefined || CHAR_SPLIT_SENTINEL.includes(separator);
  }

  private splitByCharCount(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      chunks.push(text.slice(start, end));
      if (end === text.length) break;
      const nextStart = end - this.chunkOverlap;
      if (nextStart <= start) break;
      start = nextStart;
    }
    return chunks;
  }
}
