import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UploadSourceUseCase } from '@contexts/sources/application/use-cases/upload-source.use-case';
import {
  toUploadSourceHttpResponse,
  UploadSourceHttpRequestDto,
  type UploadSourceHttpResponse,
} from './dto/upload-source.http.dto';

@Controller('sources')
export class SourcesHttpController {
  constructor(private readonly uploadSourceUseCase: UploadSourceUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Body() request: UploadSourceHttpRequestDto,
  ): Promise<UploadSourceHttpResponse> {
    const result = await this.uploadSourceUseCase.execute({
      externalSourceId: request.externalSourceId,
      content: request.content,
    });

    return toUploadSourceHttpResponse(result);
  }
}
