import { stopRuntime } from './support';

async function main(): Promise<void> {
  await stopRuntime();
  console.log('API test runtime stopped');
}

void main();
