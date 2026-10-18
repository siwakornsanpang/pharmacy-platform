import 'server-only';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getServerConfig } from '../config/server';
import { cookieOptions } from './session';

export function csrfCookieName() {
  return cookieOptions().secure ? '__Host-pharmacy_csrf' : 'pharmacy_csrf';
}

export function createCsrfToken() {
  return randomBytes(32).toString('hex');
}

export function validStaffMutation(request: NextRequest): boolean {
  if (request.headers.get('origin') !== getServerConfig().appOrigin) return false;
  const cookie = request.cookies.get(csrfCookieName())?.value ?? '';
  const header = request.headers.get('x-csrf-token') ?? '';
  if (!/^[a-f0-9]{64}$/.test(cookie) || !/^[a-f0-9]{64}$/.test(header)) return false;
  return timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
}
