import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: process.env.API_BASE_URL,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['test/support/setup.ts'],
          include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['test/support/setup.ts'],
          include: [
            'test/**/*.integration-spec.ts',
            'test/**/*.integration-spec.tsx',
          ],
          exclude: ['test/api-client/**/*.integration-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'api-client',
          environment: 'node',
          globals: true,
          globalSetup: ['test/api-client/support/global-setup.ts'],
          include: ['test/api-client/**/*.integration-spec.ts'],
          hookTimeout: 120_000,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
