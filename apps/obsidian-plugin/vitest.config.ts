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
    include: ['src/**/*.spec.ts'],
    coverage: {
      reportsDirectory: '../../coverage/apps/obsidian-plugin',
    },
  },
});