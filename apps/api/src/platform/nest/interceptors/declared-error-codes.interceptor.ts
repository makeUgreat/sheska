import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, type Observable, throwError } from 'rxjs';
import { SheskaError } from '@core/errors';
import { declaredErrorCodesOf } from '@kernels/presentation';
import { exposesCode } from '../filters/http-failure.policy';

// throw는 타입에 드러나지 않아 handler가 던지는 code와 계약의 `errors`를 컴파일 시점에 맞출 수 없다.
// 계약에 없는 code가 클라이언트로 나가지 않게 예상하지 못한 예외로 바꾸고, 누락은 내부 오류 로그로 드러낸다.
@Injectable()
export class DeclaredErrorCodesInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const declared = declaredErrorCodesOf(context.getHandler());

    return next
      .handle()
      .pipe(
        catchError((error: unknown) =>
          throwError(() =>
            isUndeclared(error, declared)
              ? new Error(
                  `Error code not declared in the HTTP contract: ${error.code}`,
                  { cause: error },
                )
              : error,
          ),
        ),
      );
  }
}

function isUndeclared(
  error: unknown,
  declared: readonly string[],
): error is SheskaError {
  return (
    error instanceof SheskaError &&
    exposesCode(error.kind) &&
    !declared.includes(error.code)
  );
}
