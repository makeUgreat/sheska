import { exec } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { runMigrations } from '../../../database/migrator';

const execAsync = promisify(exec);
const POSTGRES_TEST_CONTAINER_NAME = 'sheska.test.db';
const POSTGRES_TEST_DATABASE_URL =
  'postgres://sheska:sheska@127.0.0.1:55432/sheska_test';
const POSTGRES_COMPOSE_FILE = resolve(__dirname, 'docker-compose.yml');
const POSTGRES_COMPOSE_CWD = resolve(__dirname, '../../..');

export default async function setup(): Promise<() => Promise<void>> {
  try {
    await executeTestDatabaseContainer();
    await runMigrations(POSTGRES_TEST_DATABASE_URL);

    return async () => {
      await execAsync(`docker compose -f "${POSTGRES_COMPOSE_FILE}" down -v`, {
        cwd: POSTGRES_COMPOSE_CWD,
      });
      console.info(` 🧹 ${POSTGRES_TEST_CONTAINER_NAME} cleaned up`);
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function executeTestDatabaseContainer(): Promise<void> {
  await execAsync(`docker compose -f "${POSTGRES_COMPOSE_FILE}" down -v`, {
    cwd: POSTGRES_COMPOSE_CWD,
  });
  await execAsync(`docker compose -f "${POSTGRES_COMPOSE_FILE}" up -d`, {
    cwd: POSTGRES_COMPOSE_CWD,
  });
  await waitForHealthyContainer();
  console.info(
    ` ✅ ${POSTGRES_TEST_CONTAINER_NAME} is healthy at ${POSTGRES_TEST_DATABASE_URL}`,
  );
}

async function waitForHealthyContainer(): Promise<void> {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    let status = 'unavailable';

    try {
      const { stdout } = await execAsync(
        `docker inspect --format='{{.State.Health.Status}}' ${POSTGRES_TEST_CONTAINER_NAME}`,
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

  throw new Error(
    `Timed out waiting for ${POSTGRES_TEST_CONTAINER_NAME} healthcheck`,
  );
}
