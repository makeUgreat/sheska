import { type SourceFrontmatter } from '@contexts/sources/domain';

export interface ParsedSourceDocument {
  readonly body: string;
  readonly frontmatter: SourceFrontmatter;
  readonly title: string | null;
}

export type ParseSourceDocumentResult =
  | { readonly success: true; readonly document: ParsedSourceDocument }
  | { readonly success: false; readonly reason: string };

export interface SourceDocumentParser {
  parse(content: string): ParseSourceDocumentResult;
}
