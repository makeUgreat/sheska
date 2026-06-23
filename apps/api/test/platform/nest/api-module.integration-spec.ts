import { Test } from '@nestjs/testing';
import { ApiModule } from '@platform/nest/api.module';
import { describe, expect, it } from 'vitest';

describe('ApiModule', () => {
  it('Nest root module로 compile된다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    await moduleRef.close();

    expect(moduleRef).toBeDefined();
  });
});
