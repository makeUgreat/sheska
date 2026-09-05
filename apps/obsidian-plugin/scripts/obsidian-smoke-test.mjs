#!/usr/bin/env node

import { createServer } from 'node:http';
import { mkdtemp, mkdir, copyFile, writeFile, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const pluginId = 'sheska';
const startupDelayMs = Number(process.env.OBSIDIAN_SMOKE_STARTUP_MS ?? 8_000);
const timeoutMs = Number(process.env.OBSIDIAN_SMOKE_TIMEOUT_MS ?? 30_000);
const keepVault = process.env.OBSIDIAN_SMOKE_KEEP_VAULT === '1';
const keepObsidianOpen = process.env.OBSIDIAN_SMOKE_KEEP_OBSIDIAN_OPEN === '1';
const configuredVaultDir = process.env.OBSIDIAN_SMOKE_VAULT_DIR;
const obsidianConfigPath = join(
  process.env.HOME ?? '',
  'Library',
  'Application Support',
  'obsidian',
  'obsidian.json',
);

function log(message) {
  process.stdout.write(`[obsidian-smoke] ${message}\n`);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
      }
    });
  });
}

function exitsWithZero(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) => resolve(code === 0));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function startApiProbe() {
  let resolveUpload;
  const uploadPromise = new Promise((resolve) => {
    resolveUpload = resolve;
  });

  const requests = [];
  const server = createServer(async (req, res) => {
    const body = await readRequestBody(req);
    requests.push({ method: req.method, url: req.url, body });
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'app://obsidian.md',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/readyz') {
      res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': 'application/json',
      });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.method === 'POST' && req.url === '/sources') {
      resolveUpload({ method: req.method, url: req.url, body });
      res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': 'application/json',
      });
      res.end(
        JSON.stringify({
          sourceId: 'obsidian-smoke-source',
          externalSourceId: 'obsidian-smoke.md',
          fingerprint: 'obsidian-smoke-fingerprint',
        }),
      );
      return;
    }

    res.writeHead(404, {
      ...corsHeaders,
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify({ error: 'not found' }));
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to allocate API probe port.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    uploadPromise,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function waitForUpload(uploadPromise) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms waiting for POST /sources.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([uploadPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function prepareVault(apiBaseUrl) {
  const vaultDir =
    configuredVaultDir ??
    (await mkdtemp(join(tmpdir(), 'sheska-obsidian-smoke-vault-')));
  const obsidianDir = join(vaultDir, '.obsidian');
  const pluginDir = join(obsidianDir, 'plugins', pluginId);

  await mkdir(pluginDir, { recursive: true });
  await copyFile('main.js', join(pluginDir, 'main.js'));
  await copyFile('manifest.json', join(pluginDir, 'manifest.json'));
  await writeFile(
    join(obsidianDir, 'community-plugins.json'),
    JSON.stringify([pluginId], null, 2),
  );
  await writeFile(
    join(obsidianDir, 'app.json'),
    JSON.stringify({ safeMode: false }, null, 2),
  );
  await writeFile(
    join(pluginDir, 'data.json'),
    JSON.stringify(
      {
        settings: {
          apiBaseUrl,
          healthCheckIntervalMinutes: 0,
          autoSyncEnabled: true,
          autoSyncDebounceSeconds: 1,
          autoSyncSweepIntervalMinutes: 0.05,
        },
        syncCache: {},
      },
      null,
      2,
    ),
  );

  return vaultDir;
}

async function registerVault(vaultDir) {
  if (!existsSync(obsidianConfigPath)) {
    throw new Error(`Obsidian config not found: ${obsidianConfigPath}`);
  }

  const vaultId = randomBytes(8).toString('hex');
  const raw = await readFile(obsidianConfigPath, 'utf8');
  const config = JSON.parse(raw);
  config.vaults ??= {};
  config.vaults[vaultId] = {
    path: vaultDir,
    ts: Date.now(),
    open: true,
  };
  await writeFile(obsidianConfigPath, JSON.stringify(config));

  return vaultId;
}

async function unregisterVault(vaultId) {
  if (!existsSync(obsidianConfigPath)) return;

  const raw = await readFile(obsidianConfigPath, 'utf8');
  const config = JSON.parse(raw);
  if (config.vaults) {
    delete config.vaults[vaultId];
  }
  await writeFile(obsidianConfigPath, JSON.stringify(config));
}

async function openObsidianUri(uri) {
  if (process.platform !== 'darwin') {
    throw new Error('This smoke test currently launches Obsidian with macOS open(1).');
  }

  await run('open', [uri]);
}

async function launchObsidian(vaultId) {
  const uri = `obsidian://open?vault=${encodeURIComponent(vaultId)}`;
  log(`opening registered test vault ${vaultId}`);
  await openObsidianUri(uri);
}

async function quitObsidian() {
  if (process.platform !== 'darwin') return;
  await run('osascript', ['-e', 'tell application "Obsidian" to quit']);
}

async function createNoteInObsidian(vaultId) {
  const content = `# Obsidian smoke test\n\n${new Date().toISOString()}\n`;
  const uri =
    `obsidian://new?vault=${encodeURIComponent(vaultId)}` +
    `&file=${encodeURIComponent('obsidian-smoke.md')}` +
    `&content=${encodeURIComponent(content)}`;
  log('creating obsidian-smoke.md through Obsidian URI');
  await openObsidianUri(uri);
}

async function main() {
  if (!existsSync('manifest.json') || !existsSync('src/main.ts')) {
    throw new Error('Run this script from apps/obsidian-plugin.');
  }
  if (await exitsWithZero('pgrep', ['-x', 'Obsidian'])) {
    throw new Error(
      'Quit Obsidian before running this smoke test. The harness registers a temporary vault before launch, and a running Obsidian process does not reliably reload that vault registry.',
    );
  }

  log('building plugin');
  await run('pnpm', ['build']);

  const api = await startApiProbe();
  let vaultDir;
  let vaultId;

  try {
    log(`API probe listening at ${api.baseUrl}`);
    vaultDir = await prepareVault(api.baseUrl);
    vaultId = await registerVault(vaultDir);
    await launchObsidian(vaultId);

    log(`waiting ${startupDelayMs}ms for Obsidian to load the vault`);
    await sleep(startupDelayMs);

    await createNoteInObsidian(vaultId);

    const upload = await waitForUpload(api.uploadPromise);
    const payload = JSON.parse(upload.body);
    if (payload.externalSourceId !== 'obsidian-smoke.md') {
      throw new Error(
        `Expected externalSourceId "obsidian-smoke.md", received ${JSON.stringify(
          payload.externalSourceId,
        )}.`,
      );
    }

    log('received POST /sources from the Obsidian plugin');
  } catch (err) {
    log(`observed ${api.requests.length} HTTP request(s) before failure`);
    for (const request of api.requests) {
      log(`${request.method} ${request.url} ${request.body}`);
    }
    throw err;
  } finally {
    await api.close();
    if (vaultId) {
      await unregisterVault(vaultId);
    }
    if (!keepObsidianOpen) {
      await quitObsidian();
    }
    if (vaultDir && !configuredVaultDir && !keepVault) {
      await rm(vaultDir, { recursive: true, force: true });
    } else if (vaultDir) {
      log(`left vault in place: ${vaultDir}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
