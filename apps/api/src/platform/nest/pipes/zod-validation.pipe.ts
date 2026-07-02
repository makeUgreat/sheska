import {
  Injectable,
  type ArgumentMetadata,
  type PipeTransform,
} from '@nestjs/common';
import {
  PresentationException,
  PRESENTATION_ERROR_KIND,
  type PresentationValidationDetails,
  type PresentationValidationFieldDetail,
} from '@kernels/presentation';
import { type z } from 'zod';
import { type $ZodError, type $ZodIssue } from 'zod/v4/core';

interface ZodValidationMetadata {
  readonly zodSchema: z.ZodType;
}

@Injectable()
export class ZodValidationPipe implements PipeTransform<unknown, unknown> {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const validationMetadata = zodValidationMetadataOf(metadata.metatype);

    if (!validationMetadata) {
      return value;
    }

    const result = validationMetadata.zodSchema.safeParse(value);

    if (!result.success) {
      throw new PresentationException({
        kind: PRESENTATION_ERROR_KIND.VALIDATION_FAILED,
        code: 'request.validation_failed',
        message: 'Invalid request',
        details: this.toValidationDetails(result.error),
      });
    }

    return result.data;
  }

  private toValidationDetails(error: $ZodError): PresentationValidationDetails {
    return {
      fields: this.toValidationFieldDetails(error.issues),
    };
  }

  private toValidationFieldDetails(
    issues: $ZodIssue[],
  ): PresentationValidationFieldDetail[] {
    const fields = new Map<string, string[]>();

    for (const issue of issues) {
      const path = this.pathForIssue(issue);
      const messages = fields.get(path) ?? [];
      messages.push(issue.message);
      fields.set(path, messages);
    }

    return Array.from(fields.entries()).map(([path, messages]) => ({
      path,
      messages,
    }));
  }

  private pathForIssue(issue: $ZodIssue): string {
    const path = issue.path.join('.');

    return path.length > 0 ? path : 'body';
  }
}

function zodValidationMetadataOf(
  metatype: ArgumentMetadata['metatype'],
): ZodValidationMetadata | null {
  if (!metatype) {
    return null;
  }

  const candidate = metatype as unknown as Partial<ZodValidationMetadata>;

  if (!isZodSchema(candidate.zodSchema)) {
    return null;
  }

  return {
    zodSchema: candidate.zodSchema,
  };
}

function isZodSchema(value: unknown): value is z.ZodType {
  return (
    typeof value === 'object' &&
    value !== null &&
    'safeParse' in value &&
    typeof value.safeParse === 'function'
  );
}
