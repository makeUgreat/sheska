import { describe, expect, it } from 'vitest';
import type { SerializedRequest } from 'pino-std-serializers';
import { serializeRequest } from '../request.serializer';

function buildSerializedRequest(
  overrides: Partial<SerializedRequest>,
): SerializedRequest {
  return {
    id: 1,
    method: 'GET',
    url: '/posts',
    query: {},
    params: {},
    headers: {},
    remoteAddress: '::1',
    remotePort: 53252,
    ...overrides,
  } as SerializedRequest;
}

describe('serializeRequest', () => {
  it('cookie 헤더를 결과에서 제외한다', () => {
    const req = buildSerializedRequest({
      headers: { cookie: 'rl_session=SECRET; rl_user_id=SECRET' },
    });

    expect(serializeRequest(req).headers).not.toHaveProperty('cookie');
  });

  it('authorization 헤더를 결과에서 제외한다', () => {
    const req = buildSerializedRequest({
      headers: { authorization: 'Bearer secret-token' },
    });

    expect(serializeRequest(req).headers).not.toHaveProperty('authorization');
  });

  it('user-agent와 referer는 유지한다', () => {
    const req = buildSerializedRequest({
      headers: {
        'user-agent': 'TestAgent/1.0',
        referer: 'http://localhost:5173/',
      },
    });

    expect(serializeRequest(req).headers).toEqual({
      'user-agent': 'TestAgent/1.0',
      referer: 'http://localhost:5173/',
    });
  });

  it('id, method, url, query, params를 그대로 전달한다', () => {
    const req = buildSerializedRequest({
      query: { limit: '20' },
      params: { id: 'post-1' },
    });

    expect(serializeRequest(req)).toMatchObject({
      id: 1,
      method: 'GET',
      url: '/posts',
      query: { limit: '20' },
      params: { id: 'post-1' },
    });
  });

  it('remoteAddress/remotePort를 그대로 전달한다', () => {
    const req = buildSerializedRequest({
      remoteAddress: '127.0.0.1',
      remotePort: 53252,
    });

    expect(serializeRequest(req)).toMatchObject({
      remoteAddress: '127.0.0.1',
      remotePort: 53252,
    });
  });
});
