import { parse } from 'cookie';
import { type CookieOptions, type Request, type Response } from 'express';

// 같은 site의 다른 서브도메인이 이 쿠키를 덮어쓰지 못한다.
export const SESSION_COOKIE_NAME = '__Host-sheska_session';

const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
};

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.cookie;
  if (!header) return null;
  return parse(header)[SESSION_COOKIE_NAME] ?? null;
}

export function writeSessionCookie(response: Response, token: string, expiresAt: Date): void {
  response.cookie(SESSION_COOKIE_NAME, token, {
    ...SESSION_COOKIE_OPTIONS,
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
}
