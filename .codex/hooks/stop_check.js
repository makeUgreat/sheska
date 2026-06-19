#!/usr/bin/env node
const { existsSync, unlinkSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

function readStdin() {
  return new Promise((resolve) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    process.stdin.on('end', () => {
      resolve(input);
    });
  });
}

function safePathPart(value) {
  return String(value || 'unknown').replace(/[^A-Za-z0-9_.-]/g, '_');
}

function gitRoot(cwd) {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf8',
  }).trim();
}

function markerPath(root, payload) {
  return join(
    root,
    '.tmp',
    'codex-hooks',
    'dirty-turns',
    safePathPart(payload.session_id),
    safePathPart(payload.turn_id),
  );
}

function emit(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function main() {
  const payload = JSON.parse(await readStdin());
  const root = gitRoot(payload.cwd || '.');
  const marker = markerPath(root, payload);

  if (!existsSync(marker)) {
    return;
  }

  const result = spawnSync('pnpm', ['harness:static'], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status === 0) {
    unlinkSync(marker);
    return;
  }

  let output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  if (output.length > 6000) {
    output = output.slice(-6000);
  }

  if (payload.stop_hook_active) {
    emit({
      continue: false,
      stopReason: 'pnpm harness:static still fails after one automatic continuation.',
      systemMessage:
        'pnpm harness:static still fails. Manual review is needed.\n' +
        'Manual command: pnpm harness:static\n\n' +
        output,
    });
    return;
  }

  emit({
    decision: 'block',
    reason:
      'pnpm harness:static failed. Fix the reported static analysis failures, ' +
      'then run pnpm harness:static again before stopping.\n' +
      'Manual command: pnpm harness:static\n\n' +
      output,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
