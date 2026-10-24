import { sha256Hex } from '@core/hash';
import { describe, expect, it } from 'vitest';
import { SourceBody } from '../source-body.vo';

describe('SourceBody', () => {
  it('library.sync-6: fingerprint를 본문의 SHA-256으로 만든다', () => {
    const body = SourceBody.of('# Source note');

    expect(body.unpack().fingerprint.unpack()).toBe(sha256Hex('# Source note'));
  });

  it('빈 본문도 fingerprint를 만든다', () => {
    const body = SourceBody.of('');

    expect(body.unpack().fingerprint.unpack()).toBe(sha256Hex(''));
  });

  it('library.sync-6: 본문이 같으면 같은 본문이다', () => {
    expect(SourceBody.of('# Same').hasSameTextAs(SourceBody.of('# Same'))).toBe(
      true,
    );
  });

  it('library.sync-6: 본문이 다르면 다른 본문이다', () => {
    expect(SourceBody.of('# A').hasSameTextAs(SourceBody.of('# B'))).toBe(
      false,
    );
  });

  it('복원은 저장된 fingerprint를 그대로 쓴다', () => {
    const body = SourceBody.restore({
      text: '# Source note',
      fingerprint: 'stored-fingerprint',
    });

    expect(body.unpack().fingerprint.unpack()).toBe('stored-fingerprint');
  });

  it('복원할 fingerprint가 공백뿐이면 throw한다', () => {
    expect(() =>
      SourceBody.restore({ text: '# Source note', fingerprint: ' ' }),
    ).toThrow('Source fingerprint cannot be empty');
  });
});
