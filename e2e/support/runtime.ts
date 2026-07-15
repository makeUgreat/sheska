import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const REPO_ROOT = resolve(__dirname, '../..');
export const RUNTIME_ID = `e2e-${process.pid}`;

const RUNTIME_DIR = '/tmp/sheska-e2e-runtime';
export const API_URL_FILE = `${RUNTIME_DIR}/api-url`;
export const UI_URL_FILE = `${RUNTIME_DIR}/ui-url`;

export function readApiUrl(): string {
  return readFileSync(API_URL_FILE, 'utf8').trim();
}

export function readUiUrl(): string {
  return readFileSync(UI_URL_FILE, 'utf8').trim();
}

export async function runApiRuntimeCommand(script: string): Promise<string> {
  return runCommand('--filter', '@sheska/api', script);
}

export async function runUiRuntimeCommand(
  script: string,
  env?: Record<string, string>,
): Promise<string> {
  return runCommand('--filter', '@sheska/ui', script, env);
}

export function extractUrl(output: string): string {
  const url = output
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('http://') || line.startsWith('https://'));

  if (!url) {
    throw new Error(`URL not found in output: ${output}`);
  }

  return url;
}

async function runCommand(
  ...filterArgs: [string, string, string, Record<string, string>?]
): Promise<string> {
  const [filterFlag, filterValue, script, env] = filterArgs;
  const { stdout, stderr } = await execFileAsync(
    'pnpm',
    [filterFlag, filterValue, script],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        SHESKA_TEST_RUNTIME_ID: RUNTIME_ID,
        ...env,
      },
    },
  );

  if (stderr) process.stderr.write(stderr);

  return stdout;
}
