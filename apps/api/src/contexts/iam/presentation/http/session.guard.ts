import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { type Request } from 'express';
import { UnauthenticatedError } from '@core/errors';
import { GetSessionUseCase } from '@contexts/iam/application/use-cases/get-session.use-case';
import { readSessionCookie } from './session.cookie';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly getSessionUseCase: GetSessionUseCase) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { authenticated } = await this.getSessionUseCase.execute({
      sessionToken: readSessionCookie(request),
    });
    if (authenticated) return true;

    throw new UnauthenticatedError({
      code: 'auth.unauthenticated',
      message: 'A login session is required',
      details: {},
    });
  }
}
