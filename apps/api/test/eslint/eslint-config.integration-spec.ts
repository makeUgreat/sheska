import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import eslintConfig from '../../eslint/config.mjs';

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
  it('exports a flat config array', () => {
    expect(Array.isArray(eslintConfig)).toBe(true);
  });

  it('applies unused imports and import path style rules to source files', async () => {
    const config = await calculateConfigForFile('src/main.ts');
    const rules = getConfiguredRules(config);

    expect(rules['unused-imports/no-unused-imports']).toBeDefined();
    expect(rules['api-local/import-path-style']).toBeDefined();
  });

  it('does not apply source import path style rules to test files', async () => {
    const config = await calculateConfigForFile(
      'test/eslint/eslint-config.integration-spec.ts',
    );
    const rules = getConfiguredRules(config);

    expect(rules['unused-imports/no-unused-imports']).toBeDefined();
    expect(rules['api-local/import-path-style']).toBeUndefined();
  });

  it('removes unused imports during autofix', async () => {
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

  it('requires aliases for relative imports that cross source boundaries', async () => {
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
});
