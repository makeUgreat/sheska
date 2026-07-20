#!/usr/bin/env node
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

function emit(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function parseIfJson(raw) {
  if (raw && typeof raw === 'object') {
    return raw;
  }
  if (typeof raw !== 'string') {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function extractCommand(payload) {
  const toolInput = payload.tool_input || {};
  const args = parseIfJson(payload.arguments);
  return (
    toolInput.command ||
    toolInput.cmd ||
    payload.command ||
    payload.cmd ||
    args.command ||
    args.cmd ||
    ''
  );
}

// Claude Code's Bash tool reports command text; Codex's exec_command tool
// reports it under `cmd`. The GitHub-connector PR tool (`_create_pull_request`
// in Codex) has no command text at all, so it is matched by tool name.
function isPrCreationAttempt(payload) {
  if (payload.tool_name === '_create_pull_request') {
    return true;
  }

  const command = extractCommand(payload);
  return /(^|[;&|]\s*)gh\s+pr\s+create\b/.test(command);
}

function deny(command, result) {
  let output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  if (output.length > 6000) {
    output = output.slice(-6000);
  }

  emit({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `${command} failed, so the PR must not be opened yet. Fix the failure, ` +
        `rerun ${command}, then retry.\n\n${output}`,
    },
  });
}

async function main() {
  const payload = JSON.parse(await readStdin());

  if (!isPrCreationAttempt(payload)) {
    return;
  }

  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: payload.cwd || payload.workdir || '.',
    encoding: 'utf8',
  }).trim();

  const staticResult = spawnSync('pnpm', ['harness:static'], {
    cwd: root,
    encoding: 'utf8',
  });

  if (staticResult.status !== 0) {
    deny('pnpm harness:static', staticResult);
    return;
  }

  const buildResult = spawnSync('pnpm', ['harness:build'], {
    cwd: root,
    encoding: 'utf8',
  });

  if (buildResult.status !== 0) {
    deny('pnpm harness:build', buildResult);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
