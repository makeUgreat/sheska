import { describe, expect, it } from 'vitest';
import { parseOtelConfig } from '../otel.config';

describe('otel config', () => {
  it('환경변수가 없으면 기본값을 반환한다', () => {
    const config = parseOtelConfig({});

    expect(config).toEqual({
      otlpEndpoint: undefined,
    });
  });

  it('환경변수가 주어지면 typed config를 반환한다', () => {
    const config = parseOtelConfig({
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://127.0.0.1:4318',
    });

    expect(config).toEqual({
      otlpEndpoint: 'http://127.0.0.1:4318',
    });
  });

  it('OTEL_EXPORTER_OTLP_ENDPOINT가 URL 형식이 아니면 validation에 실패한다', () => {
    expect(() =>
      parseOtelConfig({
        OTEL_EXPORTER_OTLP_ENDPOINT: 'not-a-url',
      }),
    ).toThrow();
  });
});
