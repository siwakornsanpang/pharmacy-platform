import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { JWT } from '@fastify/jwt';
import { capabilityCatalog, isPermissionKey, type PermissionKey, type StaffIdentity } from '@pharmacy/contracts/access';
import type { BackendConfig } from '../../config/server';
import type { Database, QueryClient } from '../../db/client';
import { AccessError, capabilityGuard } from './guards';
import { lockAccessPolicy } from './policy-lock';

export type StaffActor = StaffIdentity & { sessionId: string };
export interface AccessDependencies { db: Database; config: BackendConfig; clock: () => Date }
// Supplied by the app's existing JWT plugin; the service never constructs an HTTP app.
export type StaffJwt = Pick<JWT, 'sign' | 'verify'>;
const invalidLogin = () => new AccessError(401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
const unauthorized = () => new AccessError(401, 'Unauthorized');

function identity(row: Record<string, unknown>): StaffIdentity {
  const grants = Array.isArray(row.grants) ? row.grants : [];
  return {
    id: row.id as number, username: row.username as string,
    displayName: (row.display_name || row.username) as string, role: row.role as string,
    permissions: row.role === 'admin' ? capabilityCatalog.map(item => item.key) : [...new Set(grants.filter(isPermissionKey))],
  };
}
const grantsSql = `ARRAY(SELECT DISTINCT rp.permission_key FROM role_permissions rp
  JOIN permissions p ON p.key=rp.permission_key WHERE rp.role=u.role AND rp.is_active=true ORDER BY rp.permission_key) AS grants`;

export async function currentSession(client: QueryClient, userId: number, sessionId: string, now: Date): Promise<StaffActor> {
  if (!Number.isSafeInteger(userId) || userId <= 0 || typeof sessionId !== 'string' || !sessionId) throw unauthorized();
  const row = (await client.query(`SELECT u.id,u.username,u.display_name,u.role,${grantsSql}
    FROM users u JOIN roles r ON r.name=u.role JOIN staff_sessions s ON s.user_id=u.id
    WHERE u.id=$1 AND u.active=true AND s.id=$2 AND s.expires_at>$3 AND s.revoked_at IS NULL`, [userId, sessionId, now])).rows[0];
  if (!row) throw unauthorized();
  return { ...identity(row), sessionId };
}

export function createAccessService({ db, config, clock }: AccessDependencies, jwt: StaffJwt) {
  function claims(token: string, now: Date) {
    let payload: Record<string, unknown>;
    try {
      payload = jwt.verify<Record<string, unknown>>(token, { algorithms: ['HS256'], allowedIss: config.jwtIssuer,
        allowedAud: config.jwtAudience, requiredClaims: ['iss', 'aud', 'iat', 'exp'],
        clockTimestamp: now.getTime(), clockTolerance: 0, cache: false });
    } catch { throw unauthorized(); }
    const seconds = Math.floor(now.getTime() / 1000);
    if (!payload || !Number.isSafeInteger(payload.userId) || (payload.userId as number) <= 0 ||
      typeof payload.sessionId !== 'string' || !payload.sessionId ||
      !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) ||
      (payload.iat as number) > seconds || (payload.exp as number) <= seconds || (payload.exp as number) <= (payload.iat as number)) throw unauthorized();
    return { userId: payload.userId as number, sessionId: payload.sessionId };
  }
  async function resolveStoredStaffSession(userId: number, sessionId: string) {
    return currentSession(db, userId, sessionId, clock());
  }
  async function resolveStaffActor(token: string) {
    const now = clock(); const payload = claims(token, now);
    return currentSession(db, payload.userId, payload.sessionId, now);
  }
  async function login(username: unknown, password: unknown) {
    if (typeof username !== 'string' || !username || typeof password !== 'string' || !password) throw new AccessError(400, 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
    return db.withTransaction(async tx => {
      const row = (await tx.query(`SELECT u.id,u.username,u.display_name,u.role,u.password_hash,u.active,${grantsSql}
        FROM users u JOIN roles r ON r.name=u.role WHERE u.username=$1 FOR UPDATE OF u`, [username])).rows[0];
      if (!row || row.active !== true || !await bcrypt.compare(password, row.password_hash as string)) throw invalidLogin();
      const now = clock();
      const issuedAt = Math.floor(now.getTime() / 1000);
      const expires = issuedAt + config.staffSessionTtlSeconds;
      const expiresAt = new Date(expires * 1000).toISOString();
      const sessionId = randomUUID();
      await tx.query('INSERT INTO staff_sessions(id,user_id,created_at,expires_at) VALUES($1,$2,$3,$4)', [sessionId, row.id, now, expiresAt]);
      await audit(tx, row, sessionId, 'staff.login', now);
      const token = jwt.sign({ userId: row.id as number, sessionId, iat: issuedAt, exp: expires },
        { algorithm: 'HS256', iss: config.jwtIssuer, aud: config.jwtAudience, clockTimestamp: now.getTime() });
      return { success: true as const, token, expiresAt, user: identity(row) };
    });
  }
  async function logout(token: string) {
    const now = clock(); const payload = claims(token, now);
    return db.withTransaction(async tx => {
      await lockAccessPolicy(tx);
      const row = (await tx.query(`SELECT u.id,u.username,u.role,s.revoked_at FROM users u
        JOIN roles r ON r.name=u.role JOIN staff_sessions s ON s.user_id=u.id
        WHERE u.id=$1 AND u.active=true AND s.id=$2 AND s.expires_at>$3 FOR UPDATE OF u,s`,
      [payload.userId, payload.sessionId, now])).rows[0];
      if (!row) throw unauthorized();
      if (row.revoked_at === null) {
        await tx.query('UPDATE staff_sessions SET revoked_at=$1 WHERE id=$2', [now, payload.sessionId]);
        await audit(tx, row, payload.sessionId, 'staff.logout', now);
      }
      return { success: true as const };
    });
  }
  return { login, logout, resolveStaffActor, resolveStoredStaffSession,
    requireCapability: (key: PermissionKey) => capabilityGuard(resolveStaffActor, key) };
}
async function audit(tx: QueryClient, row: Record<string, unknown>, sessionId: string, action: string, now: Date) {
  await tx.query('INSERT INTO access_audit(actor_user_id,actor_username,actor_role,session_id,action,created_at) VALUES($1,$2,$3,$4,$5,$6)',
    [row.id, row.username, row.role, sessionId, action, now]);
}
