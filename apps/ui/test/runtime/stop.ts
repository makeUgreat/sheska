import { stopRuntime } from './support';

async function main(): Promise<void> {
  await stopRuntime();
  console.log('UI test runtime stopped');
}

void main();
