import type { SerializedRequest } from 'pino-std-serializers';

const SAFE_HEADERS = ['user-agent', 'referer'] as const;

export function serializeRequest(req: SerializedRequest) {
  return {
    id: req.id,
    method: req.method,
    url: req.url,
    query: req.query,
    params: req.params,
    headers: Object.fromEntries(
      SAFE_HEADERS.filter((key) => req.headers[key] !== undefined).map(
        (key) => [key, req.headers[key]],
      ),
    ),
    remoteAddress: req.remoteAddress,
    remotePort: req.remotePort,
  };
}
