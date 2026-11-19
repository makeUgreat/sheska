import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import {
  type ApiRequest,
  type ApiResponse,
  AuthApi,
  PERMISSION,
} from '@sheska/contract';
import {
  ErrorCodes,
  Permission,
  Public,
  ZodValidationPipe,
} from '@kernels/presentation';
import { GetSessionUseCase } from '@contexts/iam/application/use-cases/get-session.use-case';
import { LogInUseCase } from '@contexts/iam/application/use-cases/log-in.use-case';
import { LogOutUseCase } from '@contexts/iam/application/use-cases/log-out.use-case';
import {
  clearSessionCookie,
  readSessionCookie,
  writeSessionCookie,
} from './session.cookie';

@Controller()
export class AuthHttpController {
  constructor(
    private readonly logInUseCase: LogInUseCase,
    private readonly logOutUseCase: LogOutUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
  ) {}

  @Post(AuthApi.logIn.path)
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @ErrorCodes(AuthApi.logIn.errors)
  async logIn(
    @Body(new ZodValidationPipe(AuthApi.logIn.request))
    body: ApiRequest<typeof AuthApi.logIn>,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const result = await this.logInUseCase.execute({
      password: body.password,
      clientAddress: clientAddressOf(request),
    });
    writeSessionCookie(response, result.sessionToken, result.expiresAt);
  }

  @Delete(AuthApi.logOut.path)
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @ErrorCodes(AuthApi.logOut.errors)
  async logOut(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.logOutUseCase.execute({
      sessionToken: readSessionCookie(request),
    });
    clearSessionCookie(response);
  }

  @Get(AuthApi.session.path)
  @Public()
  @Header('Cache-Control', 'no-store')
  @ErrorCodes(AuthApi.session.errors)
  async session(
    @Req() request: Request,
  ): Promise<ApiResponse<typeof AuthApi.session>> {
    const result = await this.getSessionUseCase.execute({
      sessionToken: readSessionCookie(request),
    });
    return AuthApi.session.response.parse(
      result satisfies ApiResponse<typeof AuthApi.session>,
    );
  }

  @Get(AuthApi.syncCheck.path)
  @Permission(PERMISSION.SOURCES_SYNC)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @ErrorCodes(AuthApi.syncCheck.errors)
  syncCheck(): void {}
}

function clientAddressOf(request: Request): string {
  // API로 들어오는 길은 Cloudflare Tunnel뿐이다. Cloudflare가 이 헤더를 실제 접속 IP로 덮어쓴다.
  const forwarded = request.headers['cf-connecting-ip'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded;
  return request.ip ?? 'unknown';
}
