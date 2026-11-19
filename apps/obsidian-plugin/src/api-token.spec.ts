import { describe, expect, it } from 'vitest';
import { App } from '../__mocks__/obsidian';
import { readApiToken, writeApiToken } from './api-token';

describe('API token storage', () => {
  it('returns null when no token is kept', () => {
    expect(readApiToken(new App() as never)).toBeNull();
  });

  it('keeps the trimmed token in secret storage', () => {
    const app = new App();

    writeApiToken(app as never, '  shk_secret\n');

    expect(app.secretStorage.getSecret('sheska-api-token')).toBe('shk_secret');
    expect(readApiToken(app as never)).toBe('shk_secret');
  });

  it('treats a cleared token as no token', () => {
    const app = new App();
    writeApiToken(app as never, 'shk_secret');

    writeApiToken(app as never, '   ');

    expect(readApiToken(app as never)).toBeNull();
  });
});
