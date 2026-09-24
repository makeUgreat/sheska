import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { cruise } from 'dependency-cruiser';
import extractDepcruiseConfig from 'dependency-cruiser/config-utl/extract-depcruise-config';
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options';
import { describe, expect, it } from 'vitest';
import type {
  ICruiseOptions,
  ICruiseResult,
  IReporterOutput,
} from 'dependency-cruiser';

// fixture 는 alias 가 아니라 상대경로로 import 한다. dependency-cruiser 의 fixture 해석기는
// baseDir 밖의 tsconfig paths 를 적용하지 못해 alias import 가 그래프에서 누락되기 때문이다.
// 규칙은 해석된 경로로 매칭하므로 상대경로로도 동일하게 검증된다. 실제 실행에서 alias 가
// 해석되는지는 `pnpm deps:check` 가 보장한다.
const uiRoot = process.cwd();
const configPath = path.join(uiRoot, 'dependency-cruiser/config.cjs');

const rootRuleNames = ['no-circular', 'not-to-unresolvable'];

const fsdRuleNames = [
  'ui-02_pages-not-to-upper-layer',
  'ui-03_widgets-not-to-upper-layer',
  'ui-04_features-not-to-upper-layer',
  'ui-05_entities-not-to-upper-layer',
  'ui-06_shared-not-to-upper-layer',
  'ui-02_pages-slices-stay-isolated',
  'ui-03_widgets-slices-stay-isolated',
  'ui-04_features-slices-stay-isolated',
  'ui-05_entities-slices-stay-isolated',
  'ui-02_pages-only-through-slice-public-api',
  'ui-03_widgets-only-through-slice-public-api',
  'ui-04_features-only-through-slice-public-api',
  'ui-05_entities-only-through-slice-public-api',
  'ui-06_shared-modules-only-through-index',
  'ui-06_shared-modules-reach-each-other-through-index',
];

const validFiles: Record<string, string> = {
  'src/06_shared/lib/markdown/parse.ts': `
    export const parse = (body: string) => body;
  `,
  'src/06_shared/lib/markdown/index.ts': `
    export { parse } from './parse';
  `,
  'src/06_shared/lib/index.ts': `
    export { parse } from './markdown';
  `,
  'src/06_shared/ui/markdown/view.ts': `
    import { parse } from '../../lib/markdown';

    export const view = parse;
  `,
  'src/06_shared/ui/markdown/index.ts': `
    export { view } from './view';
  `,
  'src/06_shared/ui/layout.ts': `
    import { view } from './markdown';

    export const layout = view;
  `,
  'src/06_shared/ui/index.ts': `
    export { layout } from './layout';
    export const Button = 'button';
  `,
  'src/05_entities/post/api/types.ts': `
    export interface PostSummary {
      id: string;
    }
  `,
  'src/05_entities/post/ui/card.ts': `
    import type { PostSummary } from '../api/types';

    export const renderCard = (post: PostSummary) => post.id;
  `,
  'src/05_entities/post/index.ts': `
    import { Button } from '../../06_shared/ui';

    export { renderCard } from './ui/card';
    export const postEntity = Button;
  `,
  'src/05_entities/source/index.ts': `
    export const sourceEntity = 'source';
  `,
  'src/04_features/posts-archive/index.ts': `
    import { postEntity } from '../../05_entities/post';

    export const postsArchiveFeature = postEntity;
  `,
  'src/04_features/source-filters/index.ts': `
    export const sourceFiltersFeature = 'source-filters';
  `,
  'src/03_widgets/posts-archive/index.ts': `
    import { postsArchiveFeature } from '../../04_features/posts-archive';

    export const postsArchiveWidget = postsArchiveFeature;
  `,
  'src/03_widgets/footer/index.ts': `
    export const footerWidget = 'footer';
  `,
  'src/02_pages/posts/ui/page.ts': `
    export const postsPageView = 'posts-page-view';
  `,
  'src/02_pages/posts/index.ts': `
    import { postsArchiveWidget } from '../../03_widgets/posts-archive';

    export { postsPageView } from './ui/page';
    export const postsPage = postsArchiveWidget;
  `,
  'src/02_pages/landing/index.ts': `
    export const landingPage = 'landing';
  `,
  'src/01_app/shell/index.ts': `
    import { postsPage } from '../../02_pages/posts';

    export const appShell = postsPage;
  `,
  'src/main.ts': `
    import { appShell } from './01_app/shell';

    export const main = appShell;
  `,
};

const invalidFiles: Record<string, string> = {
  ...validFiles,
  // 상위 레이어 import
  'src/06_shared/lib/upward.ts': `
    import { postEntity } from '../../05_entities/post';

    export const value = postEntity;
  `,
  'src/05_entities/post/upward.ts': `
    import { postsArchiveFeature } from '../../04_features/posts-archive';

    export const value = postsArchiveFeature;
  `,
  'src/04_features/posts-archive/upward.ts': `
    import { postsArchiveWidget } from '../../03_widgets/posts-archive';

    export const value = postsArchiveWidget;
  `,
  'src/03_widgets/posts-archive/upward.ts': `
    import { postsPage } from '../../02_pages/posts';

    export const value = postsPage;
  `,
  'src/02_pages/posts/upward.ts': `
    import { appShell } from '../../01_app/shell';

    export const value = appShell;
  `,
  // 같은 레이어의 다른 slice import
  'src/05_entities/post/sibling-slice.ts': `
    import { sourceEntity } from '../source';

    export const value = sourceEntity;
  `,
  'src/04_features/posts-archive/sibling-slice.ts': `
    import { sourceFiltersFeature } from '../source-filters';

    export const value = sourceFiltersFeature;
  `,
  'src/03_widgets/posts-archive/sibling-slice.ts': `
    import { footerWidget } from '../footer';

    export const value = footerWidget;
  `,
  'src/02_pages/posts/sibling-slice.ts': `
    import { landingPage } from '../landing';

    export const value = landingPage;
  `,
  // 다른 slice의 내부 직접 import
  'src/02_pages/landing/entity-internal.ts': `
    import type { PostSummary } from '../../05_entities/post/api/types';

    export const value = (post: PostSummary) => post.id;
  `,
  'src/02_pages/landing/feature-internal.ts': `
    import { value } from '../../04_features/posts-archive/upward';

    export const featureInternal = value;
  `,
  'src/02_pages/landing/widget-internal.ts': `
    import { value } from '../../03_widgets/posts-archive/upward';

    export const widgetInternal = value;
  `,
  'src/01_app/shell/page-internal.ts': `
    import { postsPageView } from '../../02_pages/posts/ui/page';

    export const value = postsPageView;
  `,
  // shared 모듈 폴더의 내부 파일 직접 import
  'src/06_shared/ui/module-internal.ts': `
    import { view } from './markdown/view';

    export const value = view;
  `,
  'src/06_shared/ui/markdown/other-module-internal.ts': `
    import { parse } from '../../lib/markdown/parse';

    export const value = parse;
  `,
};

async function writeFixtureFile(
  fixtureRoot: string,
  filePath: string,
  content: string,
): Promise<void> {
  const absolutePath = path.join(fixtureRoot, filePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);
}

async function createFixture(files: Record<string, string>): Promise<string> {
  const fixtureRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ui-dependency-cruiser-')),
  );

  await writeFixtureFile(
    fixtureRoot,
    'package.json',
    JSON.stringify({ name: 'ui-fixture', private: true }, null, 2),
  );
  await Promise.all(
    Object.entries(files).map(([filePath, content]) =>
      writeFixtureFile(fixtureRoot, filePath, content),
    ),
  );

  return fixtureRoot;
}

async function createFixtureCruiseOptions(
  fixtureRoot: string,
): Promise<ICruiseOptions> {
  const options = await extractDepcruiseOptions(configPath);

  return { ...options, baseDir: fixtureRoot };
}

async function cruiseFixture(
  files: Record<string, string>,
): Promise<IReporterOutput> {
  const fixtureRoot = await createFixture(files);

  try {
    return await cruise(['src'], await createFixtureCruiseOptions(fixtureRoot));
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

function getViolationRuleNames(result: IReporterOutput): string[] {
  const cruiseResult = result.output as ICruiseResult;

  return cruiseResult.summary.violations.map(
    (violation) => violation.rule.name,
  );
}

describe('dependency-cruiser/config.cjs', () => {
  it('root rule과 FSD rule을 함께 등록한다', async () => {
    const config = await extractDepcruiseConfig(configPath);
    const ruleNames = config.forbidden?.map((rule) => rule.name);

    expect(ruleNames).toEqual(expect.arrayContaining(rootRuleNames));
    expect(ruleNames).toEqual(expect.arrayContaining(fsdRuleNames));
  });

  it('FSD 규칙을 지킨 source graph에서는 violation을 보고하지 않는다', async () => {
    const result = await cruiseFixture(validFiles);

    expect(getViolationRuleNames(result)).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it('FSD 경계 violation을 rule name으로 보고한다', async () => {
    const result = await cruiseFixture(invalidFiles);

    expect(getViolationRuleNames(result)).toEqual(
      expect.arrayContaining(fsdRuleNames),
    );
  });
});
