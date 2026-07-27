import { describe, expect, it } from 'vitest';
import type { SerializedError } from 'pino-std-serializers';
import { serializeAccessLogError } from '../access-log-error.serializer';

function buildSerializedError(
  overrides: Partial<SerializedError>,
): SerializedError {
  return {
    type: 'Error',
    message: 'something failed',
    stack: 'Error: something failed\n    at somewhere (file.ts:1:1)',
    raw: new Error('something failed'),
    ...overrides,
  };
}

describe('serializeAccessLogError', () => {
  it('stack을 결과에서 제외한다', () => {
    const err = buildSerializedError({});

    expect(serializeAccessLogError(err)).not.toHaveProperty('stack');
  });

  it('type과 message는 유지한다', () => {
    const err = buildSerializedError({
      type: 'InfrastructureException',
      message:
        'Post paginate operation failed: relation "posts" does not exist',
    });

    expect(serializeAccessLogError(err)).toMatchObject({
      type: 'InfrastructureException',
      message:
        'Post paginate operation failed: relation "posts" does not exist',
    });
  });

  it('code가 있으면 포함한다', () => {
    const err = buildSerializedError({ code: 'post.paginate_failed' });

    expect(serializeAccessLogError(err)).toMatchObject({
      code: 'post.paginate_failed',
    });
  });

  it('code가 없으면 결과에서 제외한다', () => {
    const err = buildSerializedError({});

    expect(serializeAccessLogError(err)).not.toHaveProperty('code');
  });
});
