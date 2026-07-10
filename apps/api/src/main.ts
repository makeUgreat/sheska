import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from '@platform/nest/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableCors(
    process.env.NODE_ENV === 'production'
      ? { origin: ['app://obsidian.md', 'https://hash.meogle.co.kr'] }
      : { origin: true },
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
