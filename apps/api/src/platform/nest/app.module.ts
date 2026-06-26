import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SourcesModule } from '@contexts/sources/sources.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    SourcesModule.forRoot(),
  ],
})
export class AppModule {}
