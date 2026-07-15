import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const RUNTIME_ID = `ui-api-client-${process.pid}`;
const BASE_URL_FILE = '/tmp/sheska-ui-api-client-runtime/base-url';

export default async function setup(): Promise<() => Promise<void>> {
  await runApiRuntimeCommand('test:runtime:start');
  const baseUrl = extractBaseUrl(
    await runApiRuntimeCommand('test:runtime:url'),
  );
  await mkdir(dirname(BASE_URL_FILE), { recursive: true });
  await writeFile(BASE_URL_FILE, baseUrl);
  process.env.SHESKA_API_CLIENT_INTEGRATION_BASE_URL = baseUrl;

  return async () => {
    await runApiRuntimeCommand('test:runtime:stop');
  };
}

async function runApiRuntimeCommand(script: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync(
    'pnpm',
    ['--filter', '@sheska/api', script],
    {
      cwd: '../..',
      env: {
        ...process.env,
        SHESKA_TEST_RUNTIME_ID: RUNTIME_ID,
      },
    },
  );

  if (stderr) {
    process.stderr.write(stderr);
  }

  return stdout;
}

function extractBaseUrl(output: string): string {
  const baseUrl = output
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('http://') || line.startsWith('https://'));

  if (!baseUrl) {
    throw new Error(`API runtime URL was not found in output: ${output}`);
  }

  return baseUrl;
}
