import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const API_ROOT = resolve(__dirname, '../..');
const RUNTIME_COMPOSE_FILE = resolve(__dirname, 'docker-compose.yml');
const API_CONTAINER_PORT = '3000';
const RUNTIME_PROJECT_NAME = buildRuntimeProjectName(
  process.env.SHESKA_TEST_RUNTIME_ID,
);
const RUNTIME_PROJECT_PATTERN = /^sheska-api-test-runtime-e2e-(\d+)$/;

export async function startRuntime(): Promise<void> {
  await reapStaleRuntimes();
  await execDockerCompose(['down', '-v']);
  await execDockerCompose(['up', '-d', '--build']);
}

// A prior run's globalTeardown never fires if its process is killed (Ctrl+C,
// CI cancellation, machine sleep), leaving its containers running forever
// under a PID nothing will ever reference again. Reap any such runtime
// whose PID is no longer alive before starting a new one.
async function reapStaleRuntimes(): Promise<void> {
  const { stdout } = await execFileAsync('docker', [
    'compose',
    'ls',
    '-a',
    '--format',
    'json',
  ]);
  const projects = JSON.parse(stdout || '[]') as {
    Name: string;
    ConfigFiles: string;
  }[];

  for (const project of projects) {
    const match = RUNTIME_PROJECT_PATTERN.exec(project.Name);

    if (!match || isProcessAlive(Number(match[1]))) continue;

    await execFileAsync('docker', [
      'compose',
      '-p',
      project.Name,
      '-f',
      project.ConfigFiles,
      'down',
      '-v',
    ]);
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export async function stopRuntime(): Promise<void> {
  await execDockerCompose(['down', '-v']);
}

export async function getRuntimeBaseUrl(): Promise<string> {
  const { stdout } = await execDockerCompose(
    ['port', 'api', API_CONTAINER_PORT],
    {
      inheritOutput: false,
    },
  );
  const endpoint = stdout.trim().split('\n').at(-1);

  if (!endpoint) {
    throw new Error('API test runtime port is not published');
  }

  const [host, port] = endpoint.split(':');

  if (!host || !port) {
    throw new Error(`Unexpected API test runtime port output: ${endpoint}`);
  }

  return `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`;
}

export async function waitForRuntimeReady(): Promise<string> {
  const baseUrl = await getRuntimeBaseUrl();
  const readyUrl = new URL('/readyz', baseUrl);

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(readyUrl);

      if (response.ok) {
        return baseUrl;
      }
    } catch {
      // Retry until Docker Compose finishes starting the runtime.
    }

    await delay(Math.min(500 * 2 ** (attempt - 1), 5_000));
  }

  throw new Error(`Timed out waiting for API runtime: ${readyUrl.toString()}`);
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
    { cwd: API_ROOT },
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
    return 'sheska-api-test-runtime';
  }

  const normalized = runtimeId
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/^[^a-z0-9]+/, '')
    .replace(/[^a-z0-9]+$/, '');

  if (!normalized) {
    throw new Error(`Invalid SHESKA_TEST_RUNTIME_ID: ${runtimeId}`);
  }

  return `sheska-api-test-runtime-${normalized}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
