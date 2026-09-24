import { Injectable } from '@nestjs/common';
import { parse, YAMLParseError } from 'yaml';
import {
  type ParsedSourceDocument,
  type SourceDocumentParser,
} from '@contexts/library/application/ports';
import {
  type SourceFrontmatterProps,
  type SourceFrontmatterValue,
} from '@contexts/library/domain';
import { InvalidDataError } from '@core/errors';
import { Guard } from '@core/guard';

const BYTE_ORDER_MARK = '\uFEFF';
const DELIMITER = '---';

@Injectable()
export class SourceDocumentYamlParser implements SourceDocumentParser {
  parse(content: string): ParsedSourceDocument {
    const text = content.startsWith(BYTE_ORDER_MARK)
      ? content.slice(BYTE_ORDER_MARK.length)
      : content;
    const lines = this.splitLinesKeepingEnds(text);
    const [opening] = lines;
    const opensFrontmatter =
      this.isDelimiterLine(opening) && opening.endsWith('\n');
    if (!opensFrontmatter) {
      return { body: content, frontmatter: {}, title: null };
    }

    const closingIndex = lines.findIndex(
      (line, index) => index > 0 && this.isDelimiterLine(line),
    );
    if (closingIndex < 0) {
      throw new InvalidDataError({
        code: 'source_document.unclosed_frontmatter',
        message: 'Frontmatter is missing a closing delimiter',
        details: { fields: ['frontmatter'] },
      });
    }
    const rawFrontmatter = lines.slice(1, closingIndex).join('');
    const body = lines.slice(closingIndex + 1).join('');

    const parsed = this.parseYaml(rawFrontmatter);
    if (parsed != null && !this.isFrontmatter(parsed)) {
      throw new InvalidDataError({
        code: 'source_document.frontmatter_not_mapping',
        message: 'Frontmatter must be a YAML mapping',
        details: { fields: ['frontmatter'] },
      });
    }

    const metadata = parsed ?? {};
    const title = metadata.title;

    return {
      body,
      frontmatter: metadata,
      title:
        typeof title === 'string' && title.trim().length > 0
          ? title.trim()
          : null,
    };
  }

  private parseYaml(rawFrontmatter: string): unknown {
    try {
      return parse(rawFrontmatter);
    } catch (error: unknown) {
      if (!(error instanceof YAMLParseError)) throw error;
      throw new InvalidDataError({
        code: 'source_document.invalid_yaml',
        message: error.message,
        details: { fields: ['frontmatter'] },
        cause: error,
      });
    }
  }

  private splitLinesKeepingEnds(text: string): string[] {
    return text.split(/(?<=\n)/);
  }

  private isDelimiterLine(line: string): boolean {
    return line.trimEnd() === DELIMITER;
  }

  private isFrontmatter(value: unknown): value is SourceFrontmatterProps {
    return (
      Guard.isPlainObject(value) &&
      Object.values(value).every((entry) => this.isFrontmatterValue(entry))
    );
  }

  private isFrontmatterValue(value: unknown): value is SourceFrontmatterValue {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return true;
    }
    if (Array.isArray(value)) {
      return value.every((entry) => this.isFrontmatterValue(entry));
    }
    return (
      Guard.isPlainObject(value) &&
      Object.values(value).every((entry) => this.isFrontmatterValue(entry))
    );
  }
}
