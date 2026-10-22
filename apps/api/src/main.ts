import '@platform/otel/otel.bootstrap';

import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from '@platform/nest/app.module';
import { httpConfig } from '@platform/nest/http/http.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const { port, corsOrigins } = app.get<ConfigType<typeof httpConfig>>(
    httpConfig.KEY,
  );
  app.enableCors({ origin: corsOrigins });
  await app.listen(port);
}
void bootstrap();
