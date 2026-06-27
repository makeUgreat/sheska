import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SourcesModule } from '@contexts/sources/sources.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      isGlobal: true,
    }),
    DatabaseModule,
    SourcesModule.forRoot(),
  ],
})
export class AppModule {}
