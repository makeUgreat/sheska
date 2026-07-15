import { waitForRuntimeReady } from './support';

async function main(): Promise<void> {
  const baseUrl = await waitForRuntimeReady();
  console.log(`UI test runtime ready: ${baseUrl}`);
}

void main();
