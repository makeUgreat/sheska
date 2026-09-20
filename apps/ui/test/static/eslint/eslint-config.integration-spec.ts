import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import eslintConfig from '../../../eslint/config.mjs';

const uiRoot = process.cwd();
const configPath = path.join(uiRoot, 'eslint/config.mjs');

async function lintTextWithProjectConfig(
  code: string,
  filePath: string,
): Promise<ESLint.LintResult> {
  const eslint = new ESLint({ cwd: uiRoot, overrideConfigFile: configPath });
  const results = await eslint.lintText(code, {
    filePath: path.join(uiRoot, filePath),
  });
  const result = results[0];

  if (!result) {
    throw new Error('ESLint did not return a lint result.');
  }

  return result;
}

function findRestrictedImportMessage(
  result: ESLint.LintResult,
): string | undefined {
  return result.messages.find(
    (lintMessage) => lintMessage.ruleId === 'no-restricted-imports',
  )?.message;
}

describe('eslint/config.mjs', () => {
  it('flat config array를 export한다', () => {
    expect(Array.isArray(eslintConfig)).toBe(true);
  });

  it('상위 layer import를 편집 중에 바로 막는다', async () => {
    const result = await lintTextWithProjectConfig(
      `
        import { PostsPage } from '@/pages/posts';

        console.log(PostsPage);
      `,
      'src/04_features/posts-archive/model/use-posts-archive.ts',
    );

    expect(findRestrictedImportMessage(result)).toContain(
      'features must not depend on app or page composition.',
    );
  });

  it('하위 layer public API import는 막지 않는다', async () => {
    const result = await lintTextWithProjectConfig(
      `
        import { PostCard } from '@/entities/post';

        console.log(PostCard);
      `,
      'src/03_widgets/posts-archive/ui/example.tsx',
    );

    expect(findRestrictedImportMessage(result)).toBeUndefined();
  });
});
