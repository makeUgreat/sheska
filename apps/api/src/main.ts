import { NestFactory } from '@nestjs/core';
import { AppModule } from '@platform/nest/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(
    process.env.NODE_ENV === 'production'
      ? { origin: 'app://obsidian.md' }
      : { origin: true },
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
