import { exec, spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  type IntegrationAdapterLogContext,
  logIntegrationAdapterBanner,
  logIntegrationAdapterStep,
} from '../../support/integration-adapter-logger';

const execAsync = promisify(exec);
const OLLAMA_TEST_CONTAINER_NAME = 'sheska.test.ollama';
const OLLAMA_TEST_URL = 'http://127.0.0.1:11435';
const OLLAMA_TEST_MODEL = 'qwen3-embedding:0.6b';
const OLLAMA_COMPOSE_FILE = resolve(__dirname, 'docker-compose.yml');
const OLLAMA_COMPOSE_CWD = resolve(__dirname, '../../..');
const OLLAMA_LOG_CONTEXT: IntegrationAdapterLogContext = {
  adapter: 'OLLAMA',
  boundary: 'embedding-http',
  module: 'OllamaHttpEmbedder',
  target: `${OLLAMA_TEST_URL} (${OLLAMA_TEST_MODEL})`,
};

export default async function setup(): Promise<() => Promise<void>> {
  try {
    logIntegrationAdapterBanner(OLLAMA_LOG_CONTEXT);
    await executeTestOllamaContainer();
    await pullOllamaModel();

    return async () => {
      await execAsync(`docker compose -f "${OLLAMA_COMPOSE_FILE}" down`, {
        cwd: OLLAMA_COMPOSE_CWD,
      });
      logIntegrationAdapterStep(
        OLLAMA_LOG_CONTEXT,
        'DONE',
        `${OLLAMA_TEST_CONTAINER_NAME} cleaned up`,
      );
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function executeTestOllamaContainer(): Promise<void> {
  logIntegrationAdapterStep(
    OLLAMA_LOG_CONTEXT,
    'START',
    'Resetting docker compose services',
  );
  await execAsync(`docker compose -f "${OLLAMA_COMPOSE_FILE}" down`, {
    cwd: OLLAMA_COMPOSE_CWD,
  });
  logIntegrationAdapterStep(
    OLLAMA_LOG_CONTEXT,
    'START',
    'Starting docker compose services',
  );
  await execAsync(`docker compose -f "${OLLAMA_COMPOSE_FILE}" up -d`, {
    cwd: OLLAMA_COMPOSE_CWD,
  });
  await waitForHealthyContainer(OLLAMA_TEST_CONTAINER_NAME);
  logIntegrationAdapterStep(
    OLLAMA_LOG_CONTEXT,
    'READY',
    `${OLLAMA_TEST_CONTAINER_NAME} is healthy`,
  );
}

async function pullOllamaModel(): Promise<void> {
  const { stdout } = await execAsync(
    `docker exec ${OLLAMA_TEST_CONTAINER_NAME} ollama list`,
  );

  if (stdout.includes(OLLAMA_TEST_MODEL)) {
    logIntegrationAdapterStep(
      OLLAMA_LOG_CONTEXT,
      'READY',
      `Model ${OLLAMA_TEST_MODEL} already cached`,
    );
    return;
  }

  logIntegrationAdapterStep(
    OLLAMA_LOG_CONTEXT,
    'START',
    `Pulling model ${OLLAMA_TEST_MODEL}`,
  );

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'docker',
      ['exec', OLLAMA_TEST_CONTAINER_NAME, 'ollama', 'pull', OLLAMA_TEST_MODEL],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    child.stdout.on('data', (data: Buffer) => process.stdout.write(data));
    child.stderr.on('data', (data: Buffer) => process.stderr.write(data));

    child.on('close', (code) => {
      if (code === 0) {
        logIntegrationAdapterStep(
          OLLAMA_LOG_CONTEXT,
          'READY',
          `Model ${OLLAMA_TEST_MODEL} ready`,
        );
        resolve();
      } else {
        reject(new Error(`ollama pull exited with code ${code}`));
      }
    });
  });
}

async function waitForHealthyContainer(containerName: string): Promise<void> {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    let status = 'unavailable';

    try {
      const { stdout } = await execAsync(
        `docker inspect --format='{{.State.Health.Status}}' ${containerName}`,
        { cwd: OLLAMA_COMPOSE_CWD },
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
