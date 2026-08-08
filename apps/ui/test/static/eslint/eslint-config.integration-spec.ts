import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import eslintConfig from '../../../eslint/config.mjs';

const uiRoot = process.cwd();
const configPath = path.join(uiRoot, 'eslint/config.mjs');

function getConfiguredRules(config: unknown): Record<string, unknown> {
  return (config as { rules?: Record<string, unknown> }).rules ?? {};
}

function createProjectEslint() {
  return new ESLint({
    cwd: uiRoot,
    overrideConfigFile: configPath,
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
  const eslint = createProjectEslint();
  const results = await eslint.lintText(code, {
    filePath: path.join(uiRoot, filePath),
  });
  const result = results[0];

  if (!result) {
    throw new Error('ESLint did not return a lint result.');
  }

  return result;
}

function findFsdBoundaryMessage(result: ESLint.LintResult) {
  return result.messages.find(
    (lintMessage) => lintMessage.ruleId === 'ui-local/fsd-boundaries',
  )?.message;
}

describe('eslint/config.mjs', () => {
  it('flat config array를 export한다', () => {
    expect(Array.isArray(eslintConfig)).toBe(true);
  });

  it('production source file에 FSD boundary rule을 적용한다', async () => {
    const config = await calculateConfigForFile('src/pages/posts/index.ts');
    const rules = getConfiguredRules(config);

    expect(rules['ui-local/fsd-boundaries']).toBeDefined();
  });

  it('story file에는 FSD boundary rule을 적용하지 않는다', async () => {
    const config = await calculateConfigForFile(
      'src/entities/post/ui/post-card.stories.tsx',
    );
    const rules = getConfiguredRules(config);

    expect(rules['ui-local/fsd-boundaries']).toBeUndefined();
  });

  it('하위 layer public API import를 허용한다', async () => {
    const result = await lintTextWithProjectConfig(
      `
        import { PostCard } from '@/entities/post';
        import { StatusMessage } from '@/shared/ui';

        console.log(PostCard, StatusMessage);
      `,
      'src/widgets/posts-archive/ui/example.tsx',
    );

    expect(findFsdBoundaryMessage(result)).toBeUndefined();
  });

  it('app segment public API import를 허용한다', async () => {
    const result = await lintTextWithProjectConfig(
      `
        import { App } from '@/app/shell';

        console.log(App);
      `,
      'src/main.tsx',
    );

    expect(findFsdBoundaryMessage(result)).toBeUndefined();
  });

  it('app layer root import를 금지한다', async () => {
    const result = await lintTextWithProjectConfig(
      `
        import { App } from '@/app';

        console.log(App);
      `,
      'src/app/shell/ui/app.tsx',
    );

    expect(findFsdBoundaryMessage(result)).toContain(
      'App layer imports must target a segment public API such as "@/app/shell".',
    );
  });

  it('상위 layer import를 금지한다', async () => {
    const result = await lintTextWithProjectConfig(
      `
        import { PostsPage } from '@/pages/posts';

        console.log(PostsPage);
      `,
      'src/features/posts-archive/model/use-posts-archive.ts',
    );

    expect(findFsdBoundaryMessage(result)).toContain(
      'features code must not import the upper pages layer.',
    );
  });

  it('같은 layer의 다른 slice import를 금지한다', async () => {
    const result = await lintTextWithProjectConfig(
      `
        import { SourceListPage } from '@/pages/source-list';

        console.log(SourceListPage);
      `,
      'src/pages/posts/ui/posts-page.tsx',
    );

    expect(findFsdBoundaryMessage(result)).toContain(
      'pages slices must not import each other directly',
    );
  });

  it('다른 slice의 내부 segment import를 금지한다', async () => {
    const result = await lintTextWithProjectConfig(
      `
        import { PostCard } from '@/entities/post/ui/post-card';

        console.log(PostCard);
      `,
      'src/widgets/posts-archive/ui/posts-list-section.tsx',
    );

    expect(findFsdBoundaryMessage(result)).toContain(
      'Cross-slice imports must use the public API "@/entities/post".',
    );
  });
});
