import { ValidationFailedError } from '@core/errors';
import { callContext } from '@core/call-context';
import { type AttachmentContentStore } from '@contexts/library/application/ports';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import {
  type UploadAttachmentImageOptimizer,
  UploadAttachmentUseCase,
} from '../upload-attachment.use-case';

type OptimizerMock = {
  optimize: MockedFunction<UploadAttachmentImageOptimizer['optimize']>;
};

type StoreMock = {
  put: MockedFunction<AttachmentContentStore['put']>;
};

const ORIGINAL = new Uint8Array(100);
const OPTIMIZED = new Uint8Array(10);
const CONTEXT = callContext({ deadlineMs: 1_000, maxRetries: 0 });

function setup() {
  const optimizer: OptimizerMock = {
    optimize: vi
      .fn<UploadAttachmentImageOptimizer['optimize']>()
      .mockResolvedValue({ data: OPTIMIZED, mediaType: 'image/webp' }),
  };
  const store: StoreMock = {
    put: vi.fn<AttachmentContentStore['put']>().mockResolvedValue(undefined),
  };

  return {
    optimizer,
    store,
    useCase: new UploadAttachmentUseCase(optimizer, store),
  };
}

describe('UploadAttachmentUseCase', () => {
  it('최적화한 내용을 같은 vault 경로에 저장한다', async () => {
    const { optimizer, store, useCase } = setup();

    await useCase.execute({ path: 'att/a.jpg', data: ORIGINAL }, CONTEXT);

    expect(optimizer.optimize).toHaveBeenCalledWith(ORIGINAL);
    expect(store.put).toHaveBeenCalledWith(
      'att/a.jpg',
      OPTIMIZED,
      'image/webp',
      CONTEXT,
    );
  });

  it('저장한 형식과 원본, 결과의 크기를 돌려준다', async () => {
    const { useCase } = setup();

    const result = await useCase.execute(
      { path: 'att/a.jpg', data: ORIGINAL },
      CONTEXT,
    );

    expect(result).toEqual({
      path: 'att/a.jpg',
      mediaType: 'image/webp',
      sizeBytes: OPTIMIZED.length,
      originalSizeBytes: ORIGINAL.length,
    });
  });

  it('최적화가 거부하면 저장하지 않는다', async () => {
    const { optimizer, store, useCase } = setup();
    optimizer.optimize.mockRejectedValue(
      new ValidationFailedError({
        code: 'attachment.unsupported_media_type',
        message: 'unsupported',
        details: { fields: [] },
      }),
    );

    await expect(
      useCase.execute({ path: 'att/a.pdf', data: ORIGINAL }, CONTEXT),
    ).rejects.toMatchObject({ code: 'attachment.unsupported_media_type' });
    expect(store.put).not.toHaveBeenCalled();
  });
});
