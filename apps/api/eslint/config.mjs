// @ts-check
import { fileURLToPath } from 'node:url';
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';
import importPathStyle from './rules/import-path-style.mjs';

const tsconfigRootDir = fileURLToPath(new URL('..', import.meta.url));
const apiLocalRules = {
  rules: {
    'import-path-style': importPathStyle,
  },
};

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    files: ['{src,test}/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'commonjs',
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
    files: ['src/**/*.ts'],
    ignores: ['src/**/__tests__/**/*.ts', 'src/**/*.{spec,test}.ts'],
    plugins: {
      'api-local': apiLocalRules,
    },
    rules: {
      'api-local/import-path-style': 'error',
    },
  },
  {
    files: ['src/contexts/**/domain/**/*.ts', 'src/kernels/domain/**/*.ts'],
    ignores: ['src/**/__tests__/**/*.ts', 'src/**/*.{spec,test}.ts'],
    rules: {
      '@typescript-eslint/member-ordering': [
        'error',
        {
          classes: {
            memberTypes: [
              'private-constructor',
              [
                'field',
                'static-initialization',
                'constructor',
                'accessor',
                'get',
                'set',
                'method',
              ],
            ],
            order: 'as-written',
          },
        },
      ],
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
