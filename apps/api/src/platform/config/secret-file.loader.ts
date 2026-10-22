import { readFileSync } from 'node:fs';

export function withFileSecrets(
  env: Record<string, unknown>,
  names: readonly string[],
): Record<string, unknown> {
  const secretsFromFiles: Record<string, string> = {};

  for (const name of names) {
    const fileVariable = `${name}_FILE`;
    const path = env[fileVariable];
    if (typeof path !== 'string') {
      continue;
    }
    if (env[name] !== undefined) {
      throw new Error(`Set only one of ${name} and ${fileVariable}.`);
    }

    secretsFromFiles[name] = readSecretFile(fileVariable, path);
  }
  return { ...env, ...secretsFromFiles };
}

function readSecretFile(fileVariable: string, path: string): string {
  try {
    return withoutTrailingLineBreak(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read the file in ${fileVariable}: ${path}`, {
      cause: error,
    });
  }
}

function withoutTrailingLineBreak(content: string): string {
  return content.replace(/\r?\n$/, '');
}
