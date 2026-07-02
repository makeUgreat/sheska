import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, SheskaSettingTab } from './settings';

describe('DEFAULT_SETTINGS', () => {
  it('defaults apiBaseUrl to localhost:3000', () => {
    expect(DEFAULT_SETTINGS.apiBaseUrl).toBe('http://localhost:3000');
  });
});

describe('SheskaSettingTab', () => {
  describe('getSettingDefinitions', () => {
    it('returns one definition', () => {
      const tab = new SheskaSettingTab({} as never, {} as never);

      expect(tab.getSettingDefinitions()).toHaveLength(1);
    });

    it('defines the apiBaseUrl text control', () => {
      const tab = new SheskaSettingTab({} as never, {} as never);

      expect(tab.getSettingDefinitions()[0]).toMatchObject({
        name: 'API base URL',
        desc: 'The base URL of your Sheska API instance.',
        control: {
          type: 'text',
          key: 'apiBaseUrl',
          placeholder: 'http://localhost:3000',
        },
      });
    });
  });
});
