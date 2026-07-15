import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const RUNTIME_DIR = fileURLToPath(new URL('.', import.meta.url));
const UI_ROOT = resolve(RUNTIME_DIR, '../..');
const RUNTIME_COMPOSE_FILE = resolve(RUNTIME_DIR, 'docker-compose.yml');
const UI_CONTAINER_PORT = '4173';
const RUNTIME_PROJECT_NAME = buildRuntimeProjectName(
  process.env.SHESKA_TEST_RUNTIME_ID,
);

export async function startRuntime(): Promise<void> {
  await execDockerCompose(['down', '-v']);
  await execDockerCompose(['up', '-d', '--build']);
}

export async function stopRuntime(): Promise<void> {
  await execDockerCompose(['down', '-v']);
}

export async function getRuntimeBaseUrl(): Promise<string> {
  const { stdout } = await execDockerCompose(
    ['port', 'ui', UI_CONTAINER_PORT],
    { inheritOutput: false },
  );
  const endpoint = stdout.trim().split('\n').at(-1);

  if (!endpoint) {
    throw new Error('UI test runtime port is not published');
  }

  const [host, port] = endpoint.split(':');

  if (!host || !port) {
    throw new Error(`Unexpected UI test runtime port output: ${endpoint}`);
  }

  return `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`;
}

export async function waitForRuntimeReady(): Promise<string> {
  const baseUrl = await getRuntimeBaseUrl();

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(baseUrl);

      if (response.ok) {
        return baseUrl;
      }
    } catch {
      // Retry until Docker Compose finishes starting the runtime.
    }

    await delay(Math.min(500 * 2 ** (attempt - 1), 5_000));
  }

  throw new Error(`Timed out waiting for UI runtime: ${baseUrl}`);
}

async function execDockerCompose(
  args: string[],
  options: { inheritOutput?: boolean } = {},
): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFileAsync(
    'docker',
    [
      'compose',
      '-p',
      RUNTIME_PROJECT_NAME,
      '-f',
      RUNTIME_COMPOSE_FILE,
      ...args,
    ],
    { cwd: UI_ROOT },
  );

  if (options.inheritOutput !== false && stdout) {
    process.stdout.write(stdout);
  }

  if (options.inheritOutput !== false && stderr) {
    process.stderr.write(stderr);
  }

  return { stdout, stderr };
}

function buildRuntimeProjectName(runtimeId: string | undefined): string {
  if (!runtimeId) {
    return 'sheska-ui-test-runtime';
  }

  const normalized = runtimeId
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/^[^a-z0-9]+/, '')
    .replace(/[^a-z0-9]+$/, '');

  if (!normalized) {
    throw new Error(`Invalid SHESKA_TEST_RUNTIME_ID: ${runtimeId}`);
  }

  return `sheska-ui-test-runtime-${normalized}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
