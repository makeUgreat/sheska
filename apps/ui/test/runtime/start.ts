import { startRuntime, waitForRuntimeReady } from './support';

async function main(): Promise<void> {
  await startRuntime();
  const baseUrl = await waitForRuntimeReady();
  console.log(`UI test runtime ready: ${baseUrl}`);
}

void main();
