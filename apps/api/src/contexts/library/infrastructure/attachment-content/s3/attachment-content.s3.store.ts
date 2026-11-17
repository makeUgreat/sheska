import { Inject, Injectable } from '@nestjs/common';
import {
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { BadResponseError, TimeoutError, UnavailableError } from '@core/errors';
import { type CallContext } from '@core/call-context';
import {
  classifyInfrastructureRetry,
  resiliencePipeline,
  type ResilienceAttempt,
} from '@kernels/infrastructure';
import type {
  AttachmentContentStore,
  AttachmentImageMediaType,
} from '@contexts/library/application/ports';
import {
  attachmentContentS3Config,
  type AttachmentContentS3Config,
} from './attachment-content.s3.config';

const OBJECT_KEY_PREFIX = 'vault/';
const CACHE_CONTROL = 'no-cache';

@Injectable()
export class AttachmentContentS3Store implements AttachmentContentStore {
  private readonly client: S3Client;

  constructor(
    @Inject(attachmentContentS3Config.KEY)
    private readonly config: AttachmentContentS3Config,
  ) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: 'auto',
      maxAttempts: 1,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(
    path: string,
    data: Uint8Array,
    mediaType: AttachmentImageMediaType,
    context: CallContext,
  ): Promise<void> {
    await resiliencePipeline()
      .retry({
        maxRetries: context.maxRetries,
        baseDelayMs: 250,
        maxDelayMs: 2_000,
        classify: classifyInfrastructureRetry,
      })
      .timeout({ deadline: context.deadline, attemptTimeoutMs: 30_000 })
      .execute((attempt) => this.putOnce(path, data, mediaType, attempt));
  }

  private async putOnce(
    path: string,
    data: Uint8Array,
    mediaType: AttachmentImageMediaType,
    attempt: ResilienceAttempt,
  ): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: `${OBJECT_KEY_PREFIX}${path}`,
          Body: data,
          ContentType: mediaType,
          CacheControl: CACHE_CONTROL,
        }),
        { abortSignal: attempt.signal },
      );
    } catch (error: unknown) {
      throw toStorageError(error, attempt);
    }
  }
}

function toStorageError(
  error: unknown,
  attempt: ResilienceAttempt,
): BadResponseError | TimeoutError | UnavailableError {
  if (error instanceof S3ServiceException) {
    const statusCode = error.$metadata.httpStatusCode ?? 500;
    return new BadResponseError({
      code: 's3.bad_response',
      message: `S3 returned an error response: ${statusCode} ${error.name}`,
      details: { statusCode },
      cause: error,
    });
  }
  if (attempt.signal.aborted) {
    return new TimeoutError({
      code: 's3.request_timeout',
      message: 'S3 did not respond in time',
      details: { deadlineBound: attempt.deadlineBound },
      cause: error,
    });
  }
  return new UnavailableError({
    code: 's3.request_failed',
    message: 'S3 is unavailable',
    details: {},
    cause: error,
  });
}
