import type { AcademyMemberActor } from '@pharmacy/contracts/academy';
import { AcademyError } from './public';
import { parseCommandKey } from './commands';

export function parseAcademyId(value: unknown, message = 'ไม่พบรายการ'): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new AcademyError(400, message);
  return id;
}

export function memberActorFrom(body: Record<string, unknown> | null | undefined, query?: Record<string, unknown>): AcademyMemberActor {
  const license = String(body?.pharmacistLicense ?? query?.license ?? '').trim();
  if (!license) throw new AcademyError(400, 'ไม่พบผู้เรียน');
  const displayName = String(body?.displayName ?? license).trim() || license;
  const subject = String(body?.subject ?? license).trim() || license;
  return { kind: 'pharmacy-mock', subject, pharmacistLicense: license, displayName };
}

export function commandKeyFrom(headers: Record<string, unknown>): string {
  const offered = headers['idempotency-key'];
  return parseCommandKey(Array.isArray(offered) ? offered[0] : offered);
}
