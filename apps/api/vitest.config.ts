import { transform } from '@swc/core';
import { defineConfig, Plugin } from 'vitest/config';

function swcTransform(): Plugin {
  return {
    name: 'swc-transform',
    async transform(code, id) {
      if (!/\.[cm]?tsx?$/.test(id) || id.includes('node_modules')) {
        return null;
      }

      const result = await transform(code, {
        filename: id,
        sourceMaps: true,
        module: {
          type: 'es6',
        },
        jsc: {
          target: 'es2023',
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            useDefineForClassFields: false,
          },
          keepClassNames: true,
        },
      });

      return {
        code: result.code,
        map: result.map,
      };
    },
  };
}

export default defineConfig({
  plugins: [swcTransform()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      reportsDirectory: '../../coverage/apps/api',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          globals: false,
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'http',
          environment: 'node',
          fileParallelism: false,
          globals: false,
          include: ['test/adapters/http/**/*.integration-spec.ts'],
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'app',
          environment: 'node',
          fileParallelism: false,
          globals: false,
          include: ['test/adapters/app/**/*.integration-spec.ts'],
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'logger',
          environment: 'node',
          fileParallelism: false,
          globals: false,
          include: ['test/adapters/logger/**/*.integration-spec.ts'],
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'image',
          environment: 'node',
          fileParallelism: false,
          globals: false,
          include: ['test/adapters/image/**/*.integration-spec.ts'],
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'lint',
          environment: 'node',
          globals: false,
          include: ['test/lint/**/*.integration-spec.ts'],
          testTimeout: 60_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'postgres',
          environment: 'node',
          fileParallelism: false,
          globals: false,
          globalSetup: './test/adapters/postgres/support/global-setup.ts',
          include: ['test/adapters/postgres/**/*.integration-spec.ts'],
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'redis',
          environment: 'node',
          fileParallelism: false,
          globals: false,
          globalSetup: './test/adapters/redis/support/global-setup.ts',
          include: ['test/adapters/redis/**/*.integration-spec.ts'],
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'ollama',
          environment: 'node',
          fileParallelism: false,
          globals: false,
          globalSetup: './test/adapters/ollama/support/global-setup.ts',
          include: ['test/adapters/ollama/**/*.integration-spec.ts'],
          hookTimeout: 360_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
