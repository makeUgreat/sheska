import { type SourceFrontmatterProps } from '@contexts/sources/domain';

export interface ParsedSourceDocument {
  readonly body: string;
  readonly frontmatter: SourceFrontmatterProps;
  readonly title: string | null;
}

export interface SourceDocumentParser {
  parse(content: string): ParsedSourceDocument;
}
