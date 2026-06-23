import { newId } from '@kernels/domain';
import { describe, expect, it } from 'vitest';

const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
  it('UUID v7 문자열을 생성한다', () => {
    const id = newId();

    expect(id).toMatch(UUID_V7_PATTERN);
  });

  it('호출마다 다른 ID를 생성한다', () => {
    const firstId = newId();
    const secondId = newId();

    expect(firstId).not.toBe(secondId);
  });
});
