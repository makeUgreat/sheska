import { runApiRuntimeCommand, runUiRuntimeCommand } from './support/runtime';

export default async function globalTeardown(): Promise<void> {
  await runUiRuntimeCommand('test:runtime:stop');
  await runApiRuntimeCommand('test:runtime:stop');
}
