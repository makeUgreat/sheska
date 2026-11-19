import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachmentContentR2Config } from '../attachment-content.r2.config';

const VALID_ENV = {
  ATTACHMENT_STORAGE_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
  ATTACHMENT_STORAGE_BUCKET: 'sheska-attachments',
  ATTACHMENT_STORAGE_ACCESS_KEY_ID: 'access-key-id',
  ATTACHMENT_STORAGE_SECRET_ACCESS_KEY: 'secret-access-key',
};

function stubEnv(env: Record<string, string | undefined>): void {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
}

describe('attachmentContentR2Config', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'attachment-content-r2-'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(directory, { recursive: true, force: true });
  });

  it('환경 변수가 모두 있으면 저장소 설정을 돌려준다', () => {
    stubEnv(VALID_ENV);

    expect(attachmentContentR2Config()).toEqual({
      endpoint: 'https://account.r2.cloudflarestorage.com',
      bucket: 'sheska-attachments',
      accessKeyId: 'access-key-id',
      secretAccessKey: 'secret-access-key',
    });
  });

  it.each(Object.keys(VALID_ENV))('%s가 없으면 거부한다', (name) => {
    stubEnv({ ...VALID_ENV, [name]: undefined });

    expect(() => attachmentContentR2Config()).toThrow(name);
  });

  it('ATTACHMENT_STORAGE_ENDPOINT가 URL이 아니면 거부한다', () => {
    stubEnv({ ...VALID_ENV, ATTACHMENT_STORAGE_ENDPOINT: 'not-a-url' });

    expect(() => attachmentContentR2Config()).toThrow('ATTACHMENT_STORAGE_ENDPOINT');
  });

  it.each([
    ['ATTACHMENT_STORAGE_ACCESS_KEY_ID', 'accessKeyId'],
    ['ATTACHMENT_STORAGE_SECRET_ACCESS_KEY', 'secretAccessKey'],
  ])('%s를 _FILE 경로의 파일에서 읽는다', (name, field) => {
    const path = join(directory, name);
    writeFileSync(path, 'from-file\n');
    stubEnv({ ...VALID_ENV, [name]: undefined, [`${name}_FILE`]: path });

    expect(attachmentContentR2Config()).toMatchObject({ [field]: 'from-file' });
  });
});
