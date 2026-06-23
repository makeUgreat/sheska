import { Module, type DynamicModule } from '@nestjs/common';

export type SourcesModuleOptions = Record<string, never>;

@Module({})
export class SourcesModule {
  static forRoot(_options: SourcesModuleOptions = {}): DynamicModule {
    return {
      module: SourcesModule,
      providers: [],
      exports: [],
    };
  }
}
