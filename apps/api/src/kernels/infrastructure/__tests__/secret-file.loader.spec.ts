import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { withFileSecrets } from '../secret-file.loader';

describe('withFileSecrets', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'sheska-secret-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  function writeSecret(content: string): string {
    const path = join(directory, 'secret');
    writeFileSync(path, content);
    return path;
  }

  it('_FILE 변수가 가리키는 파일 내용을 원래 이름의 값으로 넣는다', () => {
    const path = writeSecret('postgres://user:password@db:5432/sheska');

    expect(
      withFileSecrets({ DATABASE_URL_FILE: path }, ['DATABASE_URL']),
    ).toMatchObject({
      DATABASE_URL: 'postgres://user:password@db:5432/sheska',
    });
  });

  it('파일 끝의 줄바꿈 하나를 지운다', () => {
    const path = writeSecret('secret-value\r\n');

    expect(withFileSecrets({ TOKEN_FILE: path }, ['TOKEN'])).toMatchObject({
      TOKEN: 'secret-value',
    });
  });

  it('_FILE 변수가 없으면 값을 직접 받은 그대로 둔다', () => {
    const env = { DATABASE_URL: 'postgres://localhost/sheska' };

    expect(withFileSecrets(env, ['DATABASE_URL'])).toEqual(env);
  });

  it('값과 _FILE 변수가 함께 있으면 실패한다', () => {
    const path = writeSecret('from-file');

    expect(() =>
      withFileSecrets({ TOKEN: 'direct', TOKEN_FILE: path }, ['TOKEN']),
    ).toThrow('Set only one of TOKEN and TOKEN_FILE.');
  });

  it('파일을 읽을 수 없으면 실패한다', () => {
    const path = join(directory, 'missing');

    expect(() => withFileSecrets({ TOKEN_FILE: path }, ['TOKEN'])).toThrow(
      `Cannot read the file in TOKEN_FILE: ${path}`,
    );
  });

  it('names에 없는 _FILE 변수는 읽지 않는다', () => {
    const env = { OTHER_FILE: join(directory, 'missing') };

    expect(withFileSecrets(env, ['TOKEN'])).toEqual(env);
  });
});
