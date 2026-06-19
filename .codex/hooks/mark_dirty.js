#!/usr/bin/env node
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');

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

async function main() {
  const payload = JSON.parse(await readStdin());
  const root = gitRoot(payload.cwd || '.');
  const sessionId = safePathPart(payload.session_id);
  const turnId = safePathPart(payload.turn_id);
  const marker = join(root, '.tmp', 'codex-hooks', 'dirty-turns', sessionId, turnId);

  mkdirSync(join(marker, '..'), { recursive: true });
  writeFileSync(marker, JSON.stringify({ dirty: true }), 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
