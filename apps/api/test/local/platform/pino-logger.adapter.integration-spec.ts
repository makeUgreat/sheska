import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Global, Module, type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { __resetOutOfContextForTests } from 'nestjs-pino/PinoLogger';
import { LOGGER, type LoggerPort } from '@kernels/application';
import { PinoLoggerAdapter } from '@platform/nest/logger/pino-logger.adapter';

function createLineCapture(): { stream: Writable; lines: () => string[] } {
  const captured: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      captured.push(chunk.toString());
      callback();
    },
  });
  return { stream, lines: () => captured };
}

function buildTestModule(stream: Writable) {
  @Global()
  @Module({
    imports: [
      PinoLoggerModule.forRoot({ pinoHttp: [{ level: 'info' }, stream] }),
    ],
    providers: [
      PinoLoggerAdapter,
      { provide: LOGGER, useExisting: PinoLoggerAdapter },
    ],
    exports: [LOGGER],
  })
  class TestLoggerModule {}

  return TestLoggerModule;
}

describe('PinoLoggerAdapter', () => {
  let appContext: INestApplicationContext;
  let logger: LoggerPort;
  let lines: () => string[];

  beforeEach(async () => {
    __resetOutOfContextForTests();

    const capture = createLineCapture();
    lines = capture.lines;

    appContext = await NestFactory.createApplicationContext(
      buildTestModule(capture.stream),
      { logger: false },
    );
    logger = appContext.get<LoggerPort>(LOGGER);
  });

  afterEach(async () => {
    await appContext.close();
  });

  it('HTTP 컨텍스트 없이 error()를 호출하면 error 레벨 로그가 출력된다', () => {
    logger.error('embed request failed', {
      jobId: 'job-1',
      syncJobId: 'sync-1',
    });

    const output = lines().join('');
    expect(output).toContain('embed request failed');
    expect(output).toContain('"level":50');
  });

  it('error()에 전달한 context 필드가 로그에 포함된다', () => {
    logger.error('some failure', { jobId: 'job-42' });

    const output = lines().join('');
    expect(output).toContain('job-42');
  });
});
