import { type Request } from 'express';

export function clientAddressOf(request: Request): string {
  // API로 들어오는 길은 Cloudflare Tunnel뿐이다. Cloudflare가 이 헤더를 실제 접속 IP로 덮어쓴다.
  const forwarded = request.headers['cf-connecting-ip'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded;
  return request.ip ?? 'unknown';
}
