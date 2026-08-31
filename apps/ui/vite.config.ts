import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const sourceLayerAliases = {
  '@/app': './src/01_app',
  '@/pages': './src/02_pages',
  '@/widgets': './src/03_widgets',
  '@/features': './src/04_features',
  '@/entities': './src/05_entities',
  '@/shared': './src/06_shared',
  '@': './src',
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: Object.entries(sourceLayerAliases).map(([alias, target]) => ({
      find: alias,
      replacement: fileURLToPath(new URL(target, import.meta.url)),
    })),
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
          include: [
            'src/**/*.spec.ts',
            'src/**/*.spec.tsx',
            'scripts/**/*.spec.ts',
          ],
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
          exclude: [
            'test/api-client/**/*.integration-spec.ts',
            'test/static/**/*.integration-spec.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'static',
          environment: 'node',
          globals: true,
          include: ['test/static/**/*.integration-spec.ts'],
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
