import { exec } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  type IntegrationAdapterLogContext,
  logIntegrationAdapterBanner,
  logIntegrationAdapterStep,
} from '../../../support/integration-adapter-logger';

const execAsync = promisify(exec);
const REDIS_TEST_CONTAINER_NAME = 'sheska.test.redis';
const REDIS_TEST_URL = 'redis://127.0.0.1:56379';
const REDIS_COMPOSE_FILE = resolve(__dirname, 'docker-compose.yml');
const REDIS_COMPOSE_CWD = resolve(__dirname, '../../..');
const REDIS_LOG_CONTEXT: IntegrationAdapterLogContext = {
  adapter: 'REDIS',
  boundary: 'message-broker',
  module: 'QueueModule',
  target: REDIS_TEST_URL,
};

export default async function setup(): Promise<() => Promise<void>> {
  try {
    logIntegrationAdapterBanner(REDIS_LOG_CONTEXT);
    await executeTestRedisContainer();

    return async () => {
      await execAsync(`docker compose -f "${REDIS_COMPOSE_FILE}" down -v`, {
        cwd: REDIS_COMPOSE_CWD,
      });
      logIntegrationAdapterStep(
        REDIS_LOG_CONTEXT,
        'DONE',
        `${REDIS_TEST_CONTAINER_NAME} cleaned up`,
      );
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function executeTestRedisContainer(): Promise<void> {
  logIntegrationAdapterStep(
    REDIS_LOG_CONTEXT,
    'START',
    'Resetting docker compose services',
  );
  await execAsync(`docker compose -f "${REDIS_COMPOSE_FILE}" down -v`, {
    cwd: REDIS_COMPOSE_CWD,
  });
  logIntegrationAdapterStep(
    REDIS_LOG_CONTEXT,
    'START',
    'Starting docker compose services',
  );
  await execAsync(`docker compose -f "${REDIS_COMPOSE_FILE}" up -d`, {
    cwd: REDIS_COMPOSE_CWD,
  });
  await waitForHealthyContainer(REDIS_TEST_CONTAINER_NAME);
  logIntegrationAdapterStep(
    REDIS_LOG_CONTEXT,
    'READY',
    `${REDIS_TEST_CONTAINER_NAME} is healthy`,
  );
}

async function waitForHealthyContainer(containerName: string): Promise<void> {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    let status = 'unavailable';

    try {
      const { stdout } = await execAsync(
        `docker inspect --format='{{.State.Health.Status}}' ${containerName}`,
        { cwd: REDIS_COMPOSE_CWD },
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
