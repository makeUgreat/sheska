import { mkdir, writeFile } from 'node:fs/promises';
import {
  API_URL_FILE,
  UI_URL_FILE,
  extractUrl,
  runApiRuntimeCommand,
  runUiRuntimeCommand,
} from './support/runtime';

export default async function globalSetup(): Promise<void> {
  await mkdir('/tmp/sheska-e2e-runtime', { recursive: true });

  await runApiRuntimeCommand('test:runtime:start');
  const apiUrl = extractUrl(await runApiRuntimeCommand('test:runtime:url'));
  await writeFile(API_URL_FILE, apiUrl);

  // Inside the UI Docker container, 127.0.0.1 refers to the container's own
  // loopback, not the host. Replace it with host.docker.internal so vite
  // preview can proxy requests to the API running on the host machine.
  const apiUrlForContainer = apiUrl.replace(
    '127.0.0.1',
    'host.docker.internal',
  );
  await runUiRuntimeCommand('test:runtime:start', {
    API_BASE_URL: apiUrlForContainer,
  });
  const uiUrl = extractUrl(await runUiRuntimeCommand('test:runtime:url'));
  await writeFile(UI_URL_FILE, uiUrl);

  console.log(`API: ${apiUrl}`);
  console.log(`UI:  ${uiUrl}`);
}
