import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { firstValueFrom, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { NotFoundError, UnavailableError } from '@core/errors';
import { ErrorCodes } from '@kernels/presentation';
import { DeclaredErrorCodesInterceptor } from '../declared-error-codes.interceptor';

class Handlers {
  @ErrorCodes(['source.not_found'])
  declared(this: void): void {}

  undeclared(this: void): void {}
}

function contextOf(handler: () => void): ExecutionContext {
  return { getHandler: () => handler } as unknown as ExecutionContext;
}

function failingWith(error: unknown): CallHandler {
  return { handle: () => throwError(() => error) };
}

async function rejectionOf(
  handler: () => void,
  error: unknown,
): Promise<unknown> {
  const interceptor = new DeclaredErrorCodesInterceptor();

  return firstValueFrom(
    interceptor.intercept(contextOf(handler), failingWith(error)),
  ).catch((rejected: unknown) => rejected);
}

const notFound = new NotFoundError({
  code: 'source.not_found',
  message: 'Source not found',
  details: {},
});

describe('DeclaredErrorCodesInterceptor', () => {
  it('handler가 선언한 code의 error는 그대로 전달한다', async () => {
    const rejected = await rejectionOf(Handlers.prototype.declared, notFound);

    expect(rejected).toBe(notFound);
  });

  it('handler가 선언하지 않은 code의 error는 원인을 담은 예상하지 못한 예외로 바꾼다', async () => {
    const rejected = await rejectionOf(Handlers.prototype.undeclared, notFound);

    expect(rejected).not.toBeInstanceOf(NotFoundError);
    expect(rejected).toBeInstanceOf(Error);
    expect((rejected as Error).cause).toBe(notFound);
  });

  it('code를 노출하지 않는 kind의 error는 선언과 관계없이 그대로 전달한다', async () => {
    const unavailable = new UnavailableError({
      code: 'source.find_failed',
      message: 'Database is unavailable',
      details: {},
    });

    const rejected = await rejectionOf(
      Handlers.prototype.undeclared,
      unavailable,
    );

    expect(rejected).toBe(unavailable);
  });

  it('이 프로젝트의 error가 아니면 그대로 전달한다', async () => {
    const error = new Error('boom');

    const rejected = await rejectionOf(Handlers.prototype.undeclared, error);

    expect(rejected).toBe(error);
  });
});
