// amd64-only: HuggingFace only publishes the `cpu-*` TEI image for amd64, no
// arm64 build exists. On Apple Silicon this pulls under Rosetta emulation but
// has been observed to crash (no panic logged, container just exits) during
// model warmup — likely a Candle CPU kernel using x86 SIMD instructions that
// Rosetta can't translate, not a resource or config issue (verified with
// generous memory/CPU and Rosetta already enabled). Run this suite on an
// amd64 host — CI or the target cluster's own nodes — not an Apple Silicon
// Mac.
import { exec } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  type IntegrationAdapterLogContext,
  logIntegrationAdapterBanner,
  logIntegrationAdapterStep,
} from '../../../support/integration-adapter-logger';

const execAsync = promisify(exec);
const TEI_TEST_CONTAINER_NAME = 'sheska.test.tei';
const TEI_TEST_URL = 'http://127.0.0.1:3002';
const TEI_TEST_MODEL = 'Qwen/Qwen3-Embedding-0.6B';
const TEI_COMPOSE_FILE = resolve(__dirname, 'docker-compose.yml');
const TEI_COMPOSE_CWD = resolve(__dirname, '../../..');
const TEI_LOG_CONTEXT: IntegrationAdapterLogContext = {
  adapter: 'TEI',
  boundary: 'embedding-http',
  module: 'TeiHttpEmbedder',
  target: `${TEI_TEST_URL} (${TEI_TEST_MODEL})`,
};

export default async function setup(): Promise<() => Promise<void>> {
  try {
    logIntegrationAdapterBanner(TEI_LOG_CONTEXT);
    await executeTestTeiContainer();

    return async () => {
      await execAsync(`docker compose -f "${TEI_COMPOSE_FILE}" down`, {
        cwd: TEI_COMPOSE_CWD,
      });
      logIntegrationAdapterStep(
        TEI_LOG_CONTEXT,
        'DONE',
        `${TEI_TEST_CONTAINER_NAME} cleaned up`,
      );
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function executeTestTeiContainer(): Promise<void> {
  logIntegrationAdapterStep(
    TEI_LOG_CONTEXT,
    'START',
    'Resetting docker compose services',
  );
  await execAsync(`docker compose -f "${TEI_COMPOSE_FILE}" down`, {
    cwd: TEI_COMPOSE_CWD,
  });
  logIntegrationAdapterStep(
    TEI_LOG_CONTEXT,
    'START',
    'Starting docker compose services (model download + load happens here)',
  );
  await execAsync(`docker compose -f "${TEI_COMPOSE_FILE}" up -d`, {
    cwd: TEI_COMPOSE_CWD,
  });
  await waitForHealthyContainer(TEI_TEST_CONTAINER_NAME);
  logIntegrationAdapterStep(
    TEI_LOG_CONTEXT,
    'READY',
    `${TEI_TEST_CONTAINER_NAME} is healthy`,
  );
}

async function waitForHealthyContainer(containerName: string): Promise<void> {
  // Generous budget: under QEMU emulation (e.g. amd64 image on an arm64 host)
  // the first-run weight download + Candle model warmup alone measured ~2.5min,
  // well past a typical native startup.
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    let status = 'unavailable';

    try {
      const { stdout } = await execAsync(
        `docker inspect --format='{{.State.Health.Status}}' ${containerName}`,
        { cwd: TEI_COMPOSE_CWD },
      );
      status = stdout.trim();
    } catch {
      status = 'unavailable';
    }

    if (status === 'healthy') {
      return;
    }

    await new Promise((resolveDelay) =>
      setTimeout(resolveDelay, Math.min(500 * 2 ** (attempt - 1), 10_000)),
    );
  }

  throw new Error(`Timed out waiting for ${containerName} healthcheck`);
}
