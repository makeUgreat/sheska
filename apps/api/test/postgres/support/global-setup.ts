import { exec } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { runMigrations } from '../../../database/migrator';
import {
  type IntegrationAdapterLogContext,
  logIntegrationAdapterBanner,
  logIntegrationAdapterStep,
} from '../../support/integration-adapter-logger';

const execAsync = promisify(exec);
const POSTGRES_TEST_CONTAINER_NAME = 'sheska.test.db';
const REDIS_TEST_CONTAINER_NAME = 'sheska.test.redis';
const POSTGRES_TEST_DATABASE_URL =
  'postgres://sheska:sheska@127.0.0.1:55432/sheska_test';
const POSTGRES_COMPOSE_FILE = resolve(__dirname, 'docker-compose.yml');
const POSTGRES_COMPOSE_CWD = resolve(__dirname, '../../..');
const POSTGRES_LOG_CONTEXT: IntegrationAdapterLogContext = {
  adapter: 'POSTGRES',
  boundary: 'persistence',
  module: 'DatabaseModule',
  target: POSTGRES_TEST_DATABASE_URL,
};
const REDIS_LOG_CONTEXT: IntegrationAdapterLogContext = {
  adapter: 'REDIS',
  boundary: 'message-broker',
  module: 'QueueModule',
  target: 'redis://127.0.0.1:56379',
};

export default async function setup(): Promise<() => Promise<void>> {
  try {
    logIntegrationAdapterBanner(POSTGRES_LOG_CONTEXT);
    logIntegrationAdapterBanner(REDIS_LOG_CONTEXT);
    await executeTestDatabaseContainer();
    logIntegrationAdapterStep(
      POSTGRES_LOG_CONTEXT,
      'START',
      'Running database migrations',
    );
    await runMigrations(POSTGRES_TEST_DATABASE_URL);
    logIntegrationAdapterStep(
      POSTGRES_LOG_CONTEXT,
      'DONE',
      'Database migrations completed',
    );

    return async () => {
      await execAsync(`docker compose -f "${POSTGRES_COMPOSE_FILE}" down -v`, {
        cwd: POSTGRES_COMPOSE_CWD,
      });
      logIntegrationAdapterStep(
        POSTGRES_LOG_CONTEXT,
        'DONE',
        `${POSTGRES_TEST_CONTAINER_NAME} cleaned up`,
      );
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

async function executeTestDatabaseContainer(): Promise<void> {
  logIntegrationAdapterStep(
    POSTGRES_LOG_CONTEXT,
    'START',
    'Resetting docker compose services',
  );
  await execAsync(`docker compose -f "${POSTGRES_COMPOSE_FILE}" down -v`, {
    cwd: POSTGRES_COMPOSE_CWD,
  });
  logIntegrationAdapterStep(
    POSTGRES_LOG_CONTEXT,
    'START',
    'Starting docker compose services',
  );
  await execAsync(`docker compose -f "${POSTGRES_COMPOSE_FILE}" up -d`, {
    cwd: POSTGRES_COMPOSE_CWD,
  });
  await waitForHealthyContainer(POSTGRES_TEST_CONTAINER_NAME);
  logIntegrationAdapterStep(
    POSTGRES_LOG_CONTEXT,
    'READY',
    `${POSTGRES_TEST_CONTAINER_NAME} is healthy`,
  );
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
        { cwd: POSTGRES_COMPOSE_CWD },
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
