import {
  mkdir,
  mkdtemp,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
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

const apiRoot = process.cwd();
const configPath = path.join(apiRoot, '.dependency-cruiser.cjs');

const rootRuleNames = ['no-circular', 'not-to-unresolvable'];

const apiRuleNames = [
  'api-not-to-platform-from-production',
  'api-inner-layers-not-to-frameworks',
  'api-core-is-independent',
  'api-kernels-stay-in-layer',
  'api-domain-stays-inner',
  'api-application-stays-inner',
  'api-infrastructure-not-to-presentation-or-platform',
  'api-presentation-not-to-domain-infrastructure-or-platform',
  'api-not-to-other-context-internals',
  'api-not-to-kernel-internals',
  'api-not-to-domain-internals',
  'api-not-to-application-port-internals',
];

const validFiles: Record<string, string> = {
  'src/core/result.ts': `
    export const result = 'ok';
  `,
  'src/kernels/domain/index.ts': `
    export const domainKernel = 'domain-kernel';
  `,
  'src/contexts/corrections/domain/index.ts': `
    import { result } from '@core/result';
    import { domainKernel } from '@kernels/domain';

    export const correction = [result, domainKernel].join(':');
  `,
  'src/contexts/corrections/application/ports/index.ts': `
    export interface CorrectionRepositoryPort {
      save(): void;
    }
  `,
  'src/contexts/corrections/application/use-case.ts': `
    import { correction } from '@contexts/corrections/domain';
    import type { CorrectionRepositoryPort } from './ports';

    export class CreateCorrectionUseCase {
      constructor(private readonly repository: CorrectionRepositoryPort) {}

      execute() {
        this.repository.save();
        return correction;
      }
    }
  `,
  'src/contexts/corrections/infrastructure/repository.ts': `
    import type { CorrectionRepositoryPort } from '@contexts/corrections/application/ports';

    export class MemoryCorrectionRepository implements CorrectionRepositoryPort {
      save() {}
    }
  `,
  'src/contexts/corrections/presentation/http/controller.ts': `
    import { CreateCorrectionUseCase } from '@contexts/corrections/application/use-case';

    export class CorrectionsController {
      constructor(private readonly useCase: CreateCorrectionUseCase) {}
    }
  `,
  'src/contexts/corrections/corrections.module.ts': `
    import { MemoryCorrectionRepository } from './infrastructure/repository';
    import { CorrectionsController } from './presentation/http/controller';

    export const correctionsModule = [MemoryCorrectionRepository, CorrectionsController];
  `,
  'src/platform/nest/app.module.ts': `
    import { correctionsModule } from '@contexts/corrections/corrections.module';

    export const appModule = correctionsModule;
  `,
  'src/main.ts': `
    import { appModule } from '@platform/nest/app.module';

    export const main = appModule;
  `,
  'test/support/helper.ts': `
    import { appModule } from '@platform/nest/app.module';

    export const testHelper = appModule;
  `,
};

const invalidFiles: Record<string, string> = {
  'src/core/uses-context.ts': `
    import { correction } from '../contexts/corrections/domain';

    export const value = correction;
  `,
  'src/kernels/domain/uses-context.ts': `
    import { correction } from '../../contexts/corrections/domain';

    export const value = correction;
  `,
  'src/kernels/domain/entity.base.ts': `
    export class EntityBase {}
  `,
  'src/contexts/corrections/domain/uses-application.ts': `
    import { CreateCorrectionCommand } from '../application/commands/create-correction.command';

    export const value = CreateCorrectionCommand;
  `,
  'src/contexts/corrections/domain/uses-kernel-internal.ts': `
    import { EntityBase } from '../../../kernels/domain/entity.base';

    export class CorrectionEntity extends EntityBase {}
  `,
  'src/contexts/corrections/domain/index.ts': `
    export const correction = 'correction';
  `,
  'src/contexts/corrections/domain/correction.aggregate.ts': `
    export class CorrectionAggregate {}
  `,
  'src/contexts/corrections/application/uses-infrastructure.ts': `
    import { MemoryCorrectionRepository } from '../infrastructure/repository';

    export const value = MemoryCorrectionRepository;
  `,
  'src/contexts/corrections/application/uses-domain-internal.ts': `
    import { CorrectionAggregate } from '../domain/correction.aggregate';

    export const value = CorrectionAggregate;
  `,
  'src/contexts/corrections/application/uses-framework.ts': `
    import { Injectable } from '@nestjs/common';

    export const decorator = Injectable;
  `,
  'src/contexts/corrections/application/commands/create-correction.command.ts': `
    export class CreateCorrectionCommand {}
  `,
  'src/contexts/corrections/application/ports/index.ts': `
    export interface CorrectionRepositoryPort {
      save(): void;
    }
  `,
  'src/contexts/corrections/application/ports/correction.repository.port.ts': `
    export interface InternalCorrectionRepositoryPort {
      save(): void;
    }
  `,
  'src/contexts/corrections/infrastructure/repository.ts': `
    export class MemoryCorrectionRepository {}
  `,
  'src/contexts/corrections/infrastructure/uses-presentation.ts': `
    import { CorrectionsController } from '../presentation/http/controller';

    export const value = CorrectionsController;
  `,
  'src/contexts/corrections/infrastructure/uses-application-port-internal.ts': `
    import type { InternalCorrectionRepositoryPort } from '../application/ports/correction.repository.port';

    export class Repository implements InternalCorrectionRepositoryPort {
      save() {}
    }
  `,
  'src/contexts/corrections/presentation/http/controller.ts': `
    export class CorrectionsController {}
  `,
  'src/contexts/corrections/presentation/http/uses-domain.ts': `
    import { correction } from '../../domain';

    export const value = correction;
  `,
  'src/contexts/corrections/corrections.module.ts': `
    import { appModule } from '../../platform/nest/app.module';
    import { Profile } from '../profiles/domain/profile';

    export const correctionsModule = [appModule, Profile];
  `,
  'src/contexts/profiles/domain/profile.ts': `
    export class Profile {}
  `,
  'src/platform/nest/app.module.ts': `
    export const appModule = 'app-module';
  `,
  'test/support/helper.ts': `
    export const testHelper = 'test-helper';
  `,
};

async function createFixture(files: Record<string, string>): Promise<string> {
  const fixtureRoot = await realpath(
    await mkdtemp(path.join(tmpdir(), 'api-dependency-cruiser-')),
  );

  await writeFixtureFile(
    fixtureRoot,
    'package.json',
    JSON.stringify(
      {
        name: 'dependency-cruiser-fixture',
        private: true,
        dependencies: {
          '@nestjs/common': '0.0.0',
        },
      },
      null,
      2,
    ),
  );
  await writeFixtureFile(
    fixtureRoot,
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@contexts/*': ['src/contexts/*'],
            '@core/*': ['src/core/*'],
            '@kernels/*': ['src/kernels/*'],
            '@platform/*': ['src/platform/*'],
          },
        },
      },
      null,
      2,
    ),
  );

  await Promise.all(
    Object.entries(files).map(([filePath, content]) =>
      writeFixtureFile(fixtureRoot, filePath, content),
    ),
  );
  await writeFakeNestPackage(fixtureRoot);

  return fixtureRoot;
}

async function writeFixtureFile(
  fixtureRoot: string,
  filePath: string,
  content: string,
): Promise<void> {
  const absolutePath = path.join(fixtureRoot, filePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);
}

async function writeFakeNestPackage(fixtureRoot: string): Promise<void> {
  const packageRoot =
    'node_modules/.pnpm/@nestjs+common@0.0.0/node_modules/@nestjs/common';
  const packageLink = path.join(fixtureRoot, 'node_modules/@nestjs/common');

  await writeFixtureFile(
    fixtureRoot,
    `${packageRoot}/index.js`,
    'exports.Injectable = () => () => undefined;',
  );
  await writeFixtureFile(
    fixtureRoot,
    `${packageRoot}/package.json`,
    JSON.stringify(
      {
        name: '@nestjs/common',
        version: '0.0.0',
        main: 'index.js',
      },
      null,
      2,
    ),
  );
  await mkdir(path.dirname(packageLink), { recursive: true });
  await symlink(path.join(fixtureRoot, packageRoot), packageLink, 'dir');
}

async function cruiseFixture(
  files: Record<string, string>,
): Promise<IReporterOutput> {
  const fixtureRoot = await createFixture(files);

  try {
    const options = await createFixtureCruiseOptions(fixtureRoot);

    return await cruise(['src', 'test'], options);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

async function createFixtureCruiseOptions(
  fixtureRoot: string,
): Promise<ICruiseOptions> {
  const options = await extractDepcruiseOptions(configPath);

  return {
    ...options,
    baseDir: fixtureRoot,
    tsConfig: {
      fileName: path.join(fixtureRoot, 'tsconfig.json'),
    },
  };
}

function getViolationRuleNames(result: IReporterOutput): string[] {
  const cruiseResult = result.output as ICruiseResult;

  return cruiseResult.summary.violations.map(
    (violation) => violation.rule.name,
  );
}

describe('.dependency-cruiser.cjs', () => {
  it('registers root and API rules together', async () => {
    const config = await extractDepcruiseConfig(configPath);
    const ruleNames = config.forbidden?.map((rule) => rule.name);

    expect(ruleNames).toEqual(expect.arrayContaining(rootRuleNames));
    expect(ruleNames).toEqual(expect.arrayContaining(apiRuleNames));
  });

  it('does not report violations for an allowed source graph', async () => {
    const result = await cruiseFixture(validFiles);

    expect(getViolationRuleNames(result)).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it('reports API dependency rule violations by rule name', async () => {
    const result = await cruiseFixture(invalidFiles);
    const violationRuleNames = getViolationRuleNames(result);

    expect(violationRuleNames).toEqual(expect.arrayContaining(apiRuleNames));
    expect(violationRuleNames.length).toBeGreaterThanOrEqual(
      apiRuleNames.length,
    );
  });
});
