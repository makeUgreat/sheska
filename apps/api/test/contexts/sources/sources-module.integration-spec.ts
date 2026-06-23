import { Test } from '@nestjs/testing';
import { SourcesModule } from '@contexts/sources/sources.module';
import { describe, expect, it } from 'vitest';

describe('SourcesModule', () => {
  it('SourcesModule을 Nest module로 조립한다', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SourcesModule.forRoot()],
    }).compile();

    await moduleRef.close();

    expect(moduleRef).toBeDefined();
  });
});
