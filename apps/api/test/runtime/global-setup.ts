import { type TestProject } from 'vitest/node';
import { startRuntime, stopRuntime, waitForRuntimeReady } from './support';

declare module 'vitest' {
  export interface ProvidedContext {
    runtimeBaseUrl: string;
  }
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  await startRuntime();
  try {
    project.provide('runtimeBaseUrl', await waitForRuntimeReady());
  } catch (error) {
    await stopRuntime();
    throw error;
  }

  return stopRuntime;
}
