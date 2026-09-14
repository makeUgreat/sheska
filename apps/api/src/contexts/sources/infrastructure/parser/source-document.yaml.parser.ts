import { Injectable } from '@nestjs/common';
import { parse } from 'yaml';
import {
  type ParsedSourceDocument,
  type SourceDocumentParser,
} from '@contexts/sources/application/ports';
import {
  type SourceFrontmatterProps,
  type SourceFrontmatterValue,
} from '@contexts/sources/domain';
import { Guard } from '@core/guard';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

@Injectable()
export class SourceDocumentYamlParser implements SourceDocumentParser {
  parse(content: string): ParsedSourceDocument {
    if (!/^---\r?\n/.test(content)) {
      return { body: content, frontmatter: {}, title: null };
    }

    const match = FRONTMATTER_PATTERN.exec(content);
    if (!match) {
      throw new Error('Frontmatter is missing a closing delimiter');
    }
    const [, rawFrontmatter, body] = match;

    const parsed: unknown = parse(rawFrontmatter);
    if (parsed != null && !this.isFrontmatter(parsed)) {
      throw new Error('Frontmatter must be a YAML mapping');
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
