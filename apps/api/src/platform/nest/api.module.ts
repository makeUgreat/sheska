import { Module } from '@nestjs/common';
import { SourcesModule } from '@contexts/sources/sources.module';

@Module({
  imports: [SourcesModule.forRoot()],
})
export class ApiModule {}
