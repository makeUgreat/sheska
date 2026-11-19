import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';
import { UnexpectedError } from '@core/errors';
import { ROUTE_ACCESS, type RouteAccess } from '@kernels/presentation';
import { AuthenticateRequestUseCase, type Credential } from '@contexts/iam/application/use-cases/authenticate-request.use-case';
import { AuthorizeRequestUseCase } from '@contexts/iam/application/use-cases/authorize-request.use-case';
import { readSessionCookie } from './session.cookie';

const BEARER = /^Bearer (?<token>\S+)$/;

@Injectable()
export class AccessHttpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authenticateRequest: AuthenticateRequestUseCase,
    private readonly authorizeRequest: AuthorizeRequestUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const access = this.reflector.getAllAndOverride<RouteAccess | undefined>(ROUTE_ACCESS, [context.getHandler(), context.getClass()]);
    if (access === undefined) {
      throw new UnexpectedError({
        code: 'auth.route_access_undeclared',
        message: 'The route declares neither @Public() nor @Permission()',
        details: {},
      });
    }
    if (access.kind === 'public') return true;

    const identity = await this.authenticateRequest.execute({
      credential: readCredentialPreferringBearer(context.switchToHttp().getRequest<Request>()),
    });
    this.authorizeRequest.execute({
      identity,
      permission: access.permission,
    });
    return true;
  }
}

function readCredentialPreferringBearer(request: Request): Credential | null {
  const authorization = request.headers.authorization;
  if (authorization !== undefined) {
    return {
      type: 'bearer',
      token: BEARER.exec(authorization)?.groups?.token ?? '',
    };
  }

  const sessionToken = readSessionCookie(request);
  return sessionToken === null ? null : { type: 'session', token: sessionToken };
}
