import { Module, type DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticateRequestUseCase } from '@contexts/iam/application/use-cases/authenticate-request.use-case';
import { AuthorizeRequestUseCase } from '@contexts/iam/application/use-cases/authorize-request.use-case';
import { IssueApiTokenUseCase } from '@contexts/iam/application/use-cases/issue-api-token.use-case';
import { ListApiTokensUseCase } from '@contexts/iam/application/use-cases/list-api-tokens.use-case';
import { RevokeApiTokenUseCase } from '@contexts/iam/application/use-cases/revoke-api-token.use-case';
import { GetSessionUseCase } from '@contexts/iam/application/use-cases/get-session.use-case';
import { LogInUseCase } from '@contexts/iam/application/use-cases/log-in.use-case';
import { LogOutUseCase } from '@contexts/iam/application/use-cases/log-out.use-case';
import { ApiTokenPgDrizzleQuery } from '@contexts/iam/infrastructure/persistence/postgres-drizzle/api-token.pg-drizzle.query';
import { ApiTokenPgDrizzleRepository } from '@contexts/iam/infrastructure/persistence/postgres-drizzle/api-token.pg-drizzle.repository';
import { LoginAttemptRedisCounter } from '@contexts/iam/infrastructure/login-attempt/redis/login-attempt.redis.counter';
import { OwnerPasswordSecretVerifier } from '@contexts/iam/infrastructure/owner-password/secret/owner-password.secret.verifier';
import { SessionRedisStore } from '@contexts/iam/infrastructure/session/redis/session.redis.store';
import { AccessHttpGuard } from '@contexts/iam/presentation/http/access.http.guard';
import { ApiTokenHttpController } from '@contexts/iam/presentation/http/api-token.http.controller';
import { AuthHttpController } from '@contexts/iam/presentation/http/auth.http.controller';
import {
  API_TOKEN_QUERY,
  API_TOKEN_REPOSITORY,
  LOGIN_ATTEMPT_COUNTER,
  OWNER_PASSWORD_VERIFIER,
  SESSION_STORE,
} from './iam.di-tokens';

@Module({})
export class IamModule {
  static forRoot(): DynamicModule {
    return {
      module: IamModule,
      controllers: [AuthHttpController, ApiTokenHttpController],
      providers: [
        {
          provide: OWNER_PASSWORD_VERIFIER,
          useClass: OwnerPasswordSecretVerifier,
        },
        { provide: SESSION_STORE, useClass: SessionRedisStore },
        { provide: LOGIN_ATTEMPT_COUNTER, useClass: LoginAttemptRedisCounter },
        {
          provide: API_TOKEN_REPOSITORY,
          useClass: ApiTokenPgDrizzleRepository,
        },
        { provide: API_TOKEN_QUERY, useClass: ApiTokenPgDrizzleQuery },
        LogInUseCase,
        LogOutUseCase,
        GetSessionUseCase,
        AuthenticateRequestUseCase,
        AuthorizeRequestUseCase,
        { provide: APP_GUARD, useClass: AccessHttpGuard },
        IssueApiTokenUseCase,
        ListApiTokensUseCase,
        RevokeApiTokenUseCase,
      ],
    };
  }
}
