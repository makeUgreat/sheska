import {
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';
import { callContext } from '@core/call-context';
import { AttachmentContentS3Store } from '../attachment-content.s3.store';

const CONFIG = {
  endpoint: 'https://account.r2.cloudflarestorage.com',
  bucket: 'sheska-attachments',
  accessKeyId: 'access-key-id',
  secretAccessKey: 'secret-access-key',
};
const DATA = Uint8Array.from([1, 2, 3]);

type Send = (
  command: PutObjectCommand,
  options?: { abortSignal?: AbortSignal },
) => Promise<unknown>;

function serviceError(name: string, httpStatusCode: number) {
  return new S3ServiceException({
    name,
    $fault: httpStatusCode >= 500 ? 'server' : 'client',
    $metadata: { httpStatusCode },
    message: name,
  });
}

const abortWhenSignalled: Send = (_command, options) => {
  return new Promise((_, reject) => {
    options?.abortSignal?.addEventListener('abort', () =>
      reject(new Error('Request aborted')),
    );
  });
};

describe('AttachmentContentS3Store', () => {
  let send: MockInstance<Send>;
  let store: AttachmentContentS3Store;

  beforeEach(() => {
    send = vi.spyOn(S3Client.prototype, 'send');
    store = new AttachmentContentS3Store(CONFIG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('vault 경로 앞에 vault/를 붙인 key로 형식과 no-cache를 함께 저장한다', async () => {
    send.mockResolvedValue({});

    await store.put(
      'att/my img.png',
      DATA,
      'image/webp',
      callContext({ deadlineMs: 5_000, maxRetries: 0 }),
    );

    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command?.input).toEqual({
      Bucket: 'sheska-attachments',
      Key: 'vault/att/my img.png',
      Body: DATA,
      ContentType: 'image/webp',
      CacheControl: 'no-cache',
    });
  });

  it('S3가 재시도 가능한 5xx로 한 번 실패하면 다시 보내서 저장한다', async () => {
    send
      .mockRejectedValueOnce(serviceError('SlowDown', 503))
      .mockResolvedValueOnce({});

    await store.put(
      'att/a.png',
      DATA,
      'image/png',
      callContext({ deadlineMs: 5_000, maxRetries: 2 }),
    );

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('S3가 4xx로 거부하면 재시도하지 않고 BadResponseError를 던진다', async () => {
    send.mockRejectedValue(serviceError('AccessDenied', 403));

    await expect(
      store.put(
        'att/a.png',
        DATA,
        'image/png',
        callContext({ deadlineMs: 5_000, maxRetries: 2 }),
      ),
    ).rejects.toMatchObject({
      kind: 'bad_response',
      code: 's3.bad_response',
      details: { statusCode: 403 },
    });
    expect(send).toHaveBeenCalledOnce();
  });

  it('S3에 닿지 못하면 maxRetries만큼 재시도한 뒤 UnavailableError를 던진다', async () => {
    send.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(
      store.put(
        'att/a.png',
        DATA,
        'image/png',
        callContext({ deadlineMs: 5_000, maxRetries: 1 }),
      ),
    ).rejects.toMatchObject({
      kind: 'unavailable',
      code: 's3.request_failed',
    });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('deadline 안에 응답이 없으면 요청을 끊고 TimeoutError를 던진다', async () => {
    send.mockImplementation(abortWhenSignalled);

    await expect(
      store.put(
        'att/a.png',
        DATA,
        'image/png',
        callContext({ deadlineMs: 50, maxRetries: 0 }),
      ),
    ).rejects.toMatchObject({
      kind: 'timeout',
      code: 's3.request_timeout',
      details: { deadlineBound: true },
    });
  });
});
