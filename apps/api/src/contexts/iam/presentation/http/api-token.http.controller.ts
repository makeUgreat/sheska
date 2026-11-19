import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  type ApiRequest,
  type ApiResponse,
  ApiTokenApi,
  type ApiTokenResponse,
} from '@sheska/contract';
import { ErrorCodes, ZodValidationPipe } from '@kernels/presentation';
import { type ApiTokenQueryListItem } from '@contexts/iam/application/ports';
import { IssueApiTokenUseCase } from '@contexts/iam/application/use-cases/issue-api-token.use-case';
import { ListApiTokensUseCase } from '@contexts/iam/application/use-cases/list-api-tokens.use-case';
import { RevokeApiTokenUseCase } from '@contexts/iam/application/use-cases/revoke-api-token.use-case';
import { SessionGuard } from './session.guard';

@Controller()
@UseGuards(SessionGuard)
export class ApiTokenHttpController {
  constructor(
    private readonly issueApiTokenUseCase: IssueApiTokenUseCase,
    private readonly listApiTokensUseCase: ListApiTokensUseCase,
    private readonly revokeApiTokenUseCase: RevokeApiTokenUseCase,
  ) {}

  @Post(ApiTokenApi.issue.path)
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @ErrorCodes(ApiTokenApi.issue.errors)
  async issue(
    @Body(new ZodValidationPipe(ApiTokenApi.issue.request))
    body: ApiRequest<typeof ApiTokenApi.issue>,
  ): Promise<ApiResponse<typeof ApiTokenApi.issue>> {
    const result = await this.issueApiTokenUseCase.execute({
      name: body.name,
    });

    return ApiTokenApi.issue.response.parse({
      ...toApiTokenResponse(result),
      token: result.token,
    } satisfies ApiResponse<typeof ApiTokenApi.issue>);
  }

  @Get(ApiTokenApi.list.path)
  @Header('Cache-Control', 'no-store')
  @ErrorCodes(ApiTokenApi.list.errors)
  async list(): Promise<ApiResponse<typeof ApiTokenApi.list>> {
    const apiTokens = await this.listApiTokensUseCase.execute();

    return ApiTokenApi.list.response.parse({
      apiTokens: apiTokens.map(toApiTokenResponse),
    } satisfies ApiResponse<typeof ApiTokenApi.list>);
  }

  @Delete(ApiTokenApi.revoke.path)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ErrorCodes(ApiTokenApi.revoke.errors)
  async revoke(@Param('id') id: string): Promise<void> {
    await this.revokeApiTokenUseCase.execute({ apiTokenId: id });
  }
}

function toApiTokenResponse(item: ApiTokenQueryListItem): ApiTokenResponse {
  return {
    apiTokenId: item.apiTokenId,
    name: item.name,
    hint: item.hint,
    createdAt: item.createdAt.toISOString(),
    lastUsedAt: item.lastUsedAt?.toISOString() ?? null,
  };
}
