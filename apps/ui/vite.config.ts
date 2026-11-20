import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const sourceLayerAliases = {
  '@/app': './src/01_app',
  '@/pages': './src/02_pages',
  '@/widgets': './src/03_widgets',
  '@/features': './src/04_features',
  '@/entities': './src/05_entities',
  '@/shared': './src/06_shared',
  '@': './src',
};

export default defineConfig(({ mode }) => {
  const { API_BASE_URL } = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '');
  const apiProxy = {
    '/api': {
      target: API_BASE_URL,
      rewrite: (path: string) => path.replace(/^\/api/, ''),
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: Object.entries(sourceLayerAliases).map(([alias, target]) => ({
        find: alias,
        replacement: fileURLToPath(new URL(target, import.meta.url)),
      })),
    },
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            globals: true,
            setupFiles: ['test/support/setup.ts'],
            include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx', 'scripts/**/*.spec.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'integration',
            environment: 'jsdom',
            globals: true,
            setupFiles: ['test/support/setup.ts'],
            include: ['test/**/*.integration-spec.ts', 'test/**/*.integration-spec.tsx'],
            exclude: ['test/static/**/*.integration-spec.ts'],
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
      ],
    },
  };
});
