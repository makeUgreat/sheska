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
import { type ZodError, type ZodIssue, type ZodType } from 'zod';

interface ZodValidationMetadata {
  readonly zodSchema: ZodType;
  readonly zodErrorCode?: string;
  readonly zodErrorMessage?: string;
  readonly zodMessageForIssue?: (issue: ZodIssue, path: string) => string;
}

const DEFAULT_ERROR_CODE = 'request.validation_failed';
const DEFAULT_ERROR_MESSAGE = 'Invalid request';

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
        code: validationMetadata.zodErrorCode ?? DEFAULT_ERROR_CODE,
        message: validationMetadata.zodErrorMessage ?? DEFAULT_ERROR_MESSAGE,
        details: this.toValidationDetails(result.error, validationMetadata),
      });
    }

    return result.data;
  }

  private toValidationDetails(
    error: ZodError,
    metadata: ZodValidationMetadata,
  ): PresentationValidationDetails {
    return {
      fields: this.toValidationFieldDetails(error.issues, metadata),
    };
  }

  private toValidationFieldDetails(
    issues: ZodIssue[],
    metadata: ZodValidationMetadata,
  ): PresentationValidationFieldDetail[] {
    const fields = new Map<string, string[]>();

    for (const issue of issues) {
      const path = this.pathForIssue(issue);
      const messages = fields.get(path) ?? [];
      messages.push(this.messageForIssue(issue, path, metadata));
      fields.set(path, messages);
    }

    return Array.from(fields.entries()).map(([path, messages]) => ({
      path,
      messages,
    }));
  }

  private pathForIssue(issue: ZodIssue): string {
    const path = issue.path.join('.');

    return path.length > 0 ? path : 'body';
  }

  private messageForIssue(
    issue: ZodIssue,
    path: string,
    metadata: ZodValidationMetadata,
  ): string {
    return metadata.zodMessageForIssue?.(issue, path) ?? issue.message;
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
    zodErrorCode: candidate.zodErrorCode,
    zodErrorMessage: candidate.zodErrorMessage,
    zodMessageForIssue: candidate.zodMessageForIssue,
  };
}

function isZodSchema(value: unknown): value is ZodType {
  return (
    typeof value === 'object' &&
    value !== null &&
    'safeParse' in value &&
    typeof value.safeParse === 'function'
  );
}
