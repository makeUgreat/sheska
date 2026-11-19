import { Injectable } from '@nestjs/common';
import { ForbiddenError } from '@core/errors';
import { type Identity } from '@contexts/iam/application/use-cases/authenticate-request.use-case';
import { type Permission } from '@contexts/iam/domain';

export interface AuthorizeRequestCommand {
  readonly identity: Identity;
  readonly permission: Permission;
}

@Injectable()
export class AuthorizeRequestUseCase {
  execute({ identity, permission }: AuthorizeRequestCommand): void {
    if (identity.permissions.includes(permission)) return;

    throw new ForbiddenError({
      code: 'auth.forbidden',
      message: 'The credential does not allow this request',
      details: {},
    });
  }
}
