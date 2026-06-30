import {
  APPLICATION_FAILURE_KIND,
  type ApplicationFailureOf,
  type ApplicationValidationDetails,
} from '@kernels/application';
import { describe, expect, it } from 'vitest';

describe('ApplicationFailure', () => {
  it('application error kind 상수를 제공한다', () => {
    expect(APPLICATION_FAILURE_KIND).toEqual({
      VALIDATION_FAILED: 'validation_failed',
      DEPENDENCY_UNAVAILABLE: 'dependency_unavailable',
      NOT_FOUND: 'not_found',
      STATE_CONFLICT: 'state_conflict',
      PERMISSION_DENIED: 'permission_denied',
      AUTHENTICATION_REQUIRED: 'authentication_required',
      OPERATION_NOT_ALLOWED: 'operation_not_allowed',
      RATE_LIMITED: 'rate_limited',
    });
  });

  it('validation_failed error details는 field detail 목록으로 표현한다', () => {
    const details: ApplicationValidationDetails = {
      fields: [
        {
          path: 'sourceId',
          messages: ['Source id is required'],
        },
      ],
    };
    const error: ApplicationFailureOf<
      typeof APPLICATION_FAILURE_KIND.VALIDATION_FAILED,
      'document_sync',
      'source_id_empty'
    > = {
      kind: APPLICATION_FAILURE_KIND.VALIDATION_FAILED,
      code: 'document_sync.source_id_empty',
      message: 'Document sync source id cannot be empty',
      details,
    };

    expect(error.details.fields[0]?.path).toBe('sourceId');
  });
});
