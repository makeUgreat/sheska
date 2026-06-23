import { NestFactory } from '@nestjs/core';
import { ApiModule } from '@platform/nest/api.module';

async function bootstrap() {
  const app = await NestFactory.create(ApiModule);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
