import { test as base, expect } from '@playwright/test';
import { readApiUrl, readUiUrl } from './runtime';

export const test = base.extend<{ apiBaseUrl: string }>({
  // eslint-disable-next-line no-empty-pattern
  baseURL: async ({}, use) => {
    await use(readUiUrl());
  },
  // eslint-disable-next-line no-empty-pattern
  apiBaseUrl: async ({}, use) => {
    await use(readApiUrl());
  },
});

export { expect };
