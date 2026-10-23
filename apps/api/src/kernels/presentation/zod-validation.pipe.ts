import { type z } from 'zod';
import { type $ZodError, type $ZodIssue } from 'zod/v4/core';
import { CommonErrorCode } from '@sheska/contract';
import {
  ValidationFailedError,
  type ValidationFailedDetails,
  type ValidationFieldDetail,
} from '@core/errors';

export class ZodValidationPipe<T extends z.ZodType> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new ValidationFailedError({
        code: CommonErrorCode.VALIDATION_FAILED,
        message: 'Invalid request',
        details: toValidationDetails(result.error),
      });
    }

    return result.data;
  }
}

function toValidationDetails(error: $ZodError): ValidationFailedDetails {
  return {
    fields: toValidationFieldDetails(error.issues),
  };
}

function toValidationFieldDetails(
  issues: $ZodIssue[],
): ValidationFieldDetail[] {
  const fields = new Map<string, string[]>();

  for (const issue of issues) {
    const path = pathForIssue(issue);
    const messages = fields.get(path) ?? [];
    messages.push(issue.message);
    fields.set(path, messages);
  }

  return Array.from(fields.entries()).map(([path, messages]) => ({
    path,
    messages,
  }));
}

function pathForIssue(issue: $ZodIssue): string {
  const path = issue.path.join('.');

  return path.length > 0 ? path : 'body';
}
