import type { NextRequest } from 'next/server';
import { createCsrfToken, csrfCookieName } from '@/lib/auth/csrf';
import { authJson, cookieOptions } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const existing = request.cookies.get(csrfCookieName())?.value ?? '';
  const csrfToken = /^[a-f0-9]{64}$/.test(existing) ? existing : createCsrfToken();
  const response = authJson({ csrfToken });
  response.cookies.set(csrfCookieName(), csrfToken, cookieOptions());
  return response;
}
