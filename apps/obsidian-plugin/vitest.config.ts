import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      obsidian: resolve(__dirname, '__mocks__/obsidian.ts'),
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