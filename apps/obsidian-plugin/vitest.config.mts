import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
      obsidian: resolve(import.meta.dirname, '__mocks__/obsidian.ts'),
    },
  },
  test: {
    name: 'unit',
    environment: 'node',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/obsidian-plugin',
    },
  },
});
