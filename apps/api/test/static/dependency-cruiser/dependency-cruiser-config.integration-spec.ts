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

// fixture 는 alias 가 아니라 상대경로로 import 한다. fixture 해석기는 baseDir 밖의
// tsconfig paths 를 적용하지 못해 alias import 가 의존성 그래프에서 통째로 누락되고,
// 그러면 검사할 간선이 없어 "위반 없음" 단언이 공허하게 통과한다.
// 규칙은 해석된 경로로 매칭하므로 상대경로로도 동일하게 검증된다.
const apiRoot = process.cwd();
const configPath = path.join(apiRoot, 'dependency-cruiser/config.cjs');

const rootRuleNames = ['no-circular', 'not-to-unresolvable'];

const apiRuleNames = [
  'api-not-to-platform-from-production',
  'api-inner-layers-not-to-frameworks',
  'api-application-not-to-non-di-nest-frameworks',
  'api-core-is-independent',
  'api-domain-kernel-stays-inner',
  'api-application-kernel-stays-inner',
  'api-infrastructure-kernel-follows-layer-direction',
  'api-presentation-kernel-follows-layer-direction',
  'api-kernel-cross-layer-only-through-public-surface',
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
  'src/core/guard.ts': `
    export const guard = 'ok';
  `,
  'src/kernels/domain/index.ts': `
    export const domainKernel = 'domain-kernel';
  `,
  'src/kernels/application/index.ts': `
    import { domainKernel } from '../domain';

    export const applicationKernel = domainKernel;
  `,
  'src/kernels/infrastructure/index.ts': `
    import { applicationKernel } from '../application';
    import { domainKernel } from '../domain';

    export const infrastructureKernel = [applicationKernel, domainKernel];
  `,
  'src/kernels/presentation/index.ts': `
    import { applicationKernel } from '../application';

    export const presentationKernel = applicationKernel;
  `,
  'src/contexts/corrections/domain/index.ts': `
    import { guard } from '../../../core/guard';
    import { domainKernel } from '../../../kernels/domain';

    export const correction = [guard, domainKernel].join(':');
  `,
  'src/contexts/corrections/application/ports/index.ts': `
    export interface CorrectionRepository {
      save(): void;
    }
  `,
  'src/contexts/corrections/corrections.di-tokens.ts': `
    export const CORRECTION_REPOSITORY = Symbol('CORRECTION_REPOSITORY');
  `,
  'src/contexts/corrections/application/use-case.ts': `
    import { Injectable } from '@nestjs/common';
    import { correction } from '../domain';
    import { CORRECTION_REPOSITORY } from '../corrections.di-tokens';
    import type { CorrectionRepository } from './ports';

    @Injectable()
    export class CreateCorrectionUseCase {
      constructor(private readonly repository: CorrectionRepository) {}

      execute() {
        this.repository.save();
        return [correction, CORRECTION_REPOSITORY.description].join(':');
      }
    }
  `,
  'src/contexts/corrections/infrastructure/repository.ts': `
    import type { CorrectionRepository } from '../application/ports';

    export class MemoryCorrectionRepository implements CorrectionRepository {
      save() {}
    }
  `,
  'src/contexts/corrections/presentation/http/controller.ts': `
    import { CreateCorrectionUseCase } from '../../application/use-case';

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
    import { correctionsModule } from '../../contexts/corrections/corrections.module';

    export const appModule = correctionsModule;
  `,
  'src/main.ts': `
    import { appModule } from './platform/nest/app.module';

    export const main = appModule;
  `,
  'test/support/helper.ts': `
    import { appModule } from '../../src/platform/nest/app.module';

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
  'src/kernels/domain/uses-application-kernel.ts': `
    import { applicationKernel } from '../application';

    export const value = applicationKernel;
  `,
  'src/kernels/application/uses-infrastructure-kernel.ts': `
    import { infrastructureKernel } from '../infrastructure';

    export const value = infrastructureKernel;
  `,
  'src/kernels/infrastructure/uses-presentation-kernel.ts': `
    import { presentationKernel } from '../presentation';

    export const value = presentationKernel;
  `,
  'src/kernels/presentation/uses-infrastructure-kernel.ts': `
    import { infrastructureKernel } from '../infrastructure';

    export const value = infrastructureKernel;
  `,
  'src/kernels/domain/domain-contract.ts': `
    export const internalDomainContract = 'internal';
  `,
  'src/kernels/application/uses-domain-kernel-internal.ts': `
    import { internalDomainContract } from '../domain/domain-contract';

    export const value = internalDomainContract;
  `,
  'src/kernels/application/index.ts': `
    export const applicationKernel = 'application-kernel';
  `,
  'src/kernels/infrastructure/index.ts': `
    export const infrastructureKernel = 'infrastructure-kernel';
  `,
  'src/kernels/presentation/index.ts': `
    export const presentationKernel = 'presentation-kernel';
  `,
  'src/kernels/domain/entity.base.ts': `
    export class EntityBase {}
  `,
  'src/contexts/corrections/domain/uses-application.ts': `
    import { CreateCorrectionCommand } from '../application/commands/create-correction.command';

    export const value = CreateCorrectionCommand;
  `,
  'src/contexts/corrections/domain/uses-framework.ts': `
    import { Injectable } from '@nestjs/common';

    export const decorator = Injectable;
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
    import { ModuleRef } from '@nestjs/core';

    export const value = ModuleRef;
  `,
  'src/contexts/corrections/application/commands/create-correction.command.ts': `
    export class CreateCorrectionCommand {}
  `,
  'src/contexts/corrections/application/ports/index.ts': `
    export interface CorrectionRepository {
      save(): void;
    }
  `,
  'src/contexts/corrections/application/ports/correction.repository.port.ts': `
    export interface InternalCorrectionRepository {
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
    import type { InternalCorrectionRepository } from '../application/ports/correction.repository.port';

    export class Repository implements InternalCorrectionRepository {
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
          '@nestjs/core': '0.0.0',
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
  await writeFakeNestPackages(fixtureRoot);

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

async function writeFakeNestPackages(fixtureRoot: string): Promise<void> {
  await Promise.all([
    writeFakeNestPackage(fixtureRoot, 'common', {
      Injectable: '() => () => undefined',
      Inject: '() => () => undefined',
    }),
    writeFakeNestPackage(fixtureRoot, 'core', {
      ModuleRef: 'class ModuleRef {}',
    }),
  ]);
}

async function writeFakeNestPackage(
  fixtureRoot: string,
  packageName: string,
  exports: Record<string, string>,
): Promise<void> {
  const packageRoot = `node_modules/.pnpm/@nestjs+${packageName}@0.0.0/node_modules/@nestjs/${packageName}`;
  const packageLink = path.join(
    fixtureRoot,
    `node_modules/@nestjs/${packageName}`,
  );
  const exportSource = Object.entries(exports)
    .map(([name, value]) => `exports.${name} = ${value};`)
    .join('\n');

  await writeFixtureFile(fixtureRoot, `${packageRoot}/index.js`, exportSource);
  await writeFixtureFile(
    fixtureRoot,
    `${packageRoot}/package.json`,
    JSON.stringify(
      {
        name: `@nestjs/${packageName}`,
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

describe('dependency-cruiser/config.cjs', () => {
  it('root rule과 API rule을 함께 등록한다', async () => {
    const config = await extractDepcruiseConfig(configPath);
    const ruleNames = config.forbidden?.map((rule) => rule.name);

    expect(ruleNames).toEqual(expect.arrayContaining(rootRuleNames));
    expect(ruleNames).toEqual(expect.arrayContaining(apiRuleNames));
  });

  it('허용된 source graph에서는 violation을 보고하지 않는다', async () => {
    const result = await cruiseFixture(validFiles);

    expect(getViolationRuleNames(result)).toEqual([]);
    expect(result.exitCode).toBe(0);
  });

  it('API dependency rule violation을 rule name으로 보고한다', async () => {
    const result = await cruiseFixture(invalidFiles);
    const violationRuleNames = getViolationRuleNames(result);

    expect(violationRuleNames).toEqual(expect.arrayContaining(apiRuleNames));
    expect(violationRuleNames.length).toBeGreaterThanOrEqual(
      apiRuleNames.length,
    );
  });
});
