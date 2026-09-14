import { Injectable } from '@nestjs/common';
import matter from 'gray-matter';
import { parse } from 'yaml';
import {
  type ParseSourceDocumentResult,
  type SourceDocumentParser,
} from '@contexts/sources/application/ports';
import {
  type SourceFrontmatter,
  type SourceFrontmatterValue,
} from '@contexts/sources/domain';

@Injectable()
export class SourceDocumentYamlParser implements SourceDocumentParser {
  parse(content: string): ParseSourceDocumentResult {
    if (!/^---\r?\n/.test(content)) {
      return {
        success: true,
        document: { body: content, frontmatter: {}, title: null },
      };
    }

    let parsedDocument: matter.GrayMatterFile<string>;
    try {
      parsedDocument = matter(content, {
        language: 'yaml',
        engines: {
          yaml: (yaml) => parse(yaml) as object,
        },
      });
    } catch (error: unknown) {
      return {
        success: false,
        reason:
          error instanceof Error ? error.message : 'Frontmatter parsing failed',
      };
    }

    const parsed: unknown = parsedDocument.data;
    if (parsed !== null && !this.isFrontmatter(parsed)) {
      return {
        success: false,
        reason: 'Frontmatter must be a YAML mapping',
      };
    }

    const metadata = parsed ?? {};
    const title = metadata.title;

    return {
      success: true,
      document: {
        body: parsedDocument.content,
        frontmatter: metadata,
        title:
          typeof title === 'string' && title.trim().length > 0
            ? title.trim()
            : null,
      },
    };
  }

  private isFrontmatter(value: unknown): value is SourceFrontmatter {
    return (
      this.isPlainRecord(value) &&
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
      this.isPlainRecord(value) &&
      Object.values(value).every((entry) => this.isFrontmatterValue(entry))
    );
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  }
}
