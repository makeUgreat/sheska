import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import eslintConfig from '../../../eslint/config.mjs';

const apiRoot = process.cwd();
const configPath = path.join(apiRoot, 'eslint/config.mjs');

function getConfiguredRules(config: unknown): Record<string, unknown> {
  return (config as { rules?: Record<string, unknown> }).rules ?? {};
}

function createProjectEslint(
  options: ConstructorParameters<typeof ESLint>[0] = {},
) {
  return new ESLint({
    cwd: apiRoot,
    overrideConfigFile: configPath,
    ...options,
  });
}

async function calculateConfigForFile(filePath: string): Promise<unknown> {
  const eslint = createProjectEslint();

  return eslint.calculateConfigForFile(filePath);
}

async function lintTextWithProjectConfig(
  code: string,
  filePath: string,
): Promise<ESLint.LintResult> {
  const eslint = createProjectEslint({ fix: true });
  const results = await eslint.lintText(code, {
    filePath: path.join(apiRoot, filePath),
  });
  const result = results[0];

  if (!result) {
    throw new Error('ESLint did not return a lint result.');
  }

  return result;
}

describe('eslint/config.mjs', () => {
  it('flat config array를 export한다', () => {
    expect(Array.isArray(eslintConfig)).toBe(true);
  });

  it('source file에 unused import와 import path style rule을 적용한다', async () => {
    const config = await calculateConfigForFile('src/main.ts');
    const rules = getConfiguredRules(config);

    expect(rules['unused-imports/no-unused-imports']).toBeDefined();
    expect(rules['api-local/import-path-style']).toBeDefined();
  });

  it('test file에는 source import path style rule을 적용하지 않는다', async () => {
    const config = await calculateConfigForFile(
      'test/static/eslint/eslint-config.integration-spec.ts',
    );
    const rules = getConfiguredRules(config);

    expect(rules['unused-imports/no-unused-imports']).toBeDefined();
    expect(rules['api-local/import-path-style']).toBeUndefined();
  });

  it('autofix에서 unused import를 제거한다', async () => {
    const result = await lintTextWithProjectConfig(
      `
        import { readFileSync } from 'node:fs';

        const value = 1;
        console.log(value);
      `,
      'src/main.ts',
    );

    expect(result.output).not.toContain('readFileSync');
  });

  it('source boundary를 넘는 relative import에는 alias를 요구한다', async () => {
    const result = await lintTextWithProjectConfig(
      `
        import { appModule } from './platform/nest/app.module';

        console.log(appModule);
      `,
      'src/main.ts',
    );

    const message = result.messages.find(
      (lintMessage) => lintMessage.ruleId === 'api-local/import-path-style',
    )?.message;

    expect(message).toContain('@platform/nest/app.module');
  });

  it('application code에서 좁은 NestJS DI metadata import를 허용한다', async () => {
    const result = await lintTextWithProjectConfig(
      `
        import { Inject, Injectable } from '@nestjs/common';

        @Injectable()
        export class CreateCorrectionUseCase {
          constructor(@Inject('repository') private readonly repository: unknown) {}

          execute() {
            return this.repository;
          }
        }
      `,
      'src/contexts/sources/application/use-cases/upload-source.use-case.ts',
    );

    expect(
      result.messages.some(
        (lintMessage) => lintMessage.ruleId === 'no-restricted-imports',
      ),
    ).toBe(false);
  });

  it('application code에서 NestJS DI 범위를 벗어난 common import를 금지한다', async () => {
    const result = await lintTextWithProjectConfig(
      `
        import { Controller, Injectable } from '@nestjs/common';

        @Injectable()
        export class CreateCorrectionUseCase {
          controller = Controller;
        }
      `,
      'src/contexts/sources/application/use-cases/upload-source.use-case.ts',
    );

    const message = result.messages.find(
      (lintMessage) => lintMessage.ruleId === 'no-restricted-imports',
    )?.message;

    expect(message).toContain('Application code may import only narrow');
  });
});
