import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loggerConfig } from '../logger.config';

describe('loggerConfig', () => {
  beforeEach(() => {
    vi.stubEnv('LOG_LEVEL', undefined);
    vi.stubEnv('LOG_FORMAT', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('설정이 없으면 info 수준의 json 형식을 쓴다', () => {
    expect(loggerConfig()).toEqual({ level: 'info', format: 'json' });
  });

  it('LOG_LEVEL과 LOG_FORMAT으로 로그 설정을 바꾼다', () => {
    vi.stubEnv('LOG_LEVEL', 'debug');
    vi.stubEnv('LOG_FORMAT', 'pretty');

    expect(loggerConfig()).toEqual({ level: 'debug', format: 'pretty' });
  });

  it('LOG_LEVEL이 허용 값이 아니면 거부한다', () => {
    vi.stubEnv('LOG_LEVEL', 'verbose');

    expect(() => loggerConfig()).toThrow('LOG_LEVEL');
  });

  it('LOG_FORMAT이 허용 값이 아니면 거부한다', () => {
    vi.stubEnv('LOG_FORMAT', 'text');

    expect(() => loggerConfig()).toThrow('LOG_FORMAT');
  });
});
