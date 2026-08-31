// @ts-check
import { fileURLToPath } from 'node:url';
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';
import fsdBoundaries from './rules/fsd-boundaries.mjs';

const tsconfigRootDir = fileURLToPath(new URL('..', import.meta.url));
const uiLocalRules = {
  rules: {
    'fsd-boundaries': fsdBoundaries,
  },
};

export default tseslint.config(
  {
    ignores: ['eslint/config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    files: ['{src,test,scripts}/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir,
      },
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          vars: 'all',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.spec.{ts,tsx}', 'src/**/*.stories.{ts,tsx}'],
    plugins: {
      'ui-local': uiLocalRules,
    },
    rules: {
      'ui-local/fsd-boundaries': 'error',
    },
  },
  {
    files: ['src/06_shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*', '@/pages/*', '@/features/*', '@/entities/*'],
              message:
                'shared code must stay domain-free and must not depend on upper FSD layers.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/05_entities/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*', '@/pages/*', '@/features/*'],
              message:
                'entities may depend on shared code, but not on app, pages, or features.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/04_features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*', '@/pages/*'],
              message: 'features must not depend on app or page composition.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/02_pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*'],
              message: 'pages must not depend on app bootstrap or providers.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/**/*.spec.{ts,tsx}',
      'scripts/**/*.spec.{ts,tsx}',
      'test/**/*.integration-spec.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
);
