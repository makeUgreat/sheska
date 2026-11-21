import { afterEach, describe, expect, it, vi } from 'vitest';
import { anthropicConfig } from '../anthropic.config';

describe('anthropicConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('ANTHROPIC_API_KEY가 있으면 API 키를 돌려준다', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test');

    expect(anthropicConfig()).toEqual({ apiKey: 'sk-ant-test' });
  });

  it.each([undefined, ''])('ANTHROPIC_API_KEY가 %j이면 거부한다', (value) => {
    vi.stubEnv('ANTHROPIC_API_KEY', value);

    expect(() => anthropicConfig()).toThrow('ANTHROPIC_API_KEY');
  });
});
