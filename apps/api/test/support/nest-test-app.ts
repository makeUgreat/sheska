import { type INestApplication, type Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';

export async function createTestNestApp(
  rootModule: Type<unknown>,
): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [rootModule],
  }).compile();
  const app = moduleFixture.createNestApplication();

  await app.init();

  return app;
}
