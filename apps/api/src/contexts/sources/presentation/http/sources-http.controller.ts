import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { UploadSourceUseCase } from '@contexts/sources/application/use-cases/upload-source.use-case';
import { ListSourcesUseCase } from '@contexts/sources/application/use-cases/list-sources.use-case';
import { GetSourceUseCase } from '@contexts/sources/application/use-cases/get-source.use-case';
import {
  toUploadSourceHttpResponse,
  UploadSourceHttpRequest,
  type UploadSourceHttpResponse,
} from './dto/upload-source.http.dto';
import {
  toListSourcesHttpResponse,
  type ListSourcesHttpResponse,
} from './dto/list-sources.http.dto';
import {
  toGetSourceHttpResponse,
  type GetSourceHttpResponse,
} from './dto/get-source.http.dto';

@Controller('sources')
export class SourcesHttpController {
  constructor(
    private readonly uploadSourceUseCase: UploadSourceUseCase,
    private readonly listSourcesUseCase: ListSourcesUseCase,
    private readonly getSourceUseCase: GetSourceUseCase,
  ) {}

  @Get()
  async list(): Promise<ListSourcesHttpResponse> {
    const result = await this.listSourcesUseCase.execute();
    return toListSourcesHttpResponse(result);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<GetSourceHttpResponse> {
    const result = await this.getSourceUseCase.execute({ sourceId: id });
    return toGetSourceHttpResponse(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Body() request: UploadSourceHttpRequest,
  ): Promise<UploadSourceHttpResponse> {
    const result = await this.uploadSourceUseCase.execute({
      externalSourceId: request.externalSourceId,
      content: request.content,
    });

    return toUploadSourceHttpResponse(result);
  }
}
