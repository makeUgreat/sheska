import { getRuntimeBaseUrl } from './support';

async function main(): Promise<void> {
  console.log(await getRuntimeBaseUrl());
}

void main();
