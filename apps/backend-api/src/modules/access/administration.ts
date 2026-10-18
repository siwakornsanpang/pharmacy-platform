import bcrypt from 'bcryptjs';
import { capabilityCatalog, isPermissionKey, type PermissionKey } from '@pharmacy/contracts/access';
import type { QueryClient } from '../../db/client';
import { AccessError } from './guards';
import { currentSession, type AccessDependencies, type StaffActor } from './service';
import { lockAccessPolicy } from './policy-lock';
const knownKeys = capabilityCatalog.map(item => item.key);
const forbidden = () => new AccessError(403, 'Forbidden');
export function bodyFields(body: unknown, keys: string[]): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !keys.includes(key)))
    throw new AccessError(400, 'Invalid request');
  return body as Record<string, unknown>;
}
export function boundedText(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f\x7f]/.test(value))
    throw new AccessError(400, 'Invalid request');
  return value.trim();
}
export function validPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 12 || Buffer.byteLength(value, 'utf8') > 72)
    throw new AccessError(400, 'Password must be at least 12 characters and at most 72 UTF-8 bytes');
  return value;
}
function selectedPermissions(value: unknown): PermissionKey[] {
  if (!Array.isArray(value) || value.some(key => !isPermissionKey(key)))
    throw new AccessError(400, 'Invalid permissions');
  return [...new Set(value)] as PermissionKey[];
}
export async function mutationAudit(tx: QueryClient, actor: {
  id: number;
  username: string;
  role: string;
  sessionId: string;
}, action: string, details: Record<string, unknown>, now: Date) {
  await tx.query('INSERT INTO access_audit(actor_user_id,actor_username,actor_role,session_id,action,details,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)', [actor.id, actor.username, actor.role, actor.sessionId, action, JSON.stringify(details), now]);
}
async function roleGrants(tx: QueryClient, role: string): Promise<PermissionKey[]> {
  const rows = (await tx.query(`SELECT DISTINCT rp.permission_key FROM role_permissions rp JOIN permissions p ON p.key=rp.permission_key
  WHERE rp.role=$1 AND rp.is_active=true ORDER BY rp.permission_key`, [role])).rows;
  return rows.map(row => row.permission_key).filter(isPermissionKey);
}
async function requireRole(tx: QueryClient, role: string) {
  if (!(await tx.query('SELECT name FROM roles WHERE name=$1', [role])).rows[0])
    throw new AccessError(400, 'Unknown role');
}
async function boundedRole(tx: QueryClient, actor: StaffActor, role: string) {
  await requireRole(tx, role);
  if (actor.role !== 'admin' && (role === 'admin' || (await roleGrants(tx, role)).some(key => !actor.permissions.includes(key))))
    throw forbidden();
}
async function writeGrants(tx: QueryClient, role: string, selected: PermissionKey[]) {
  const definitions = (await tx.query('SELECT key FROM permissions WHERE key=ANY($1::text[])', [selected])).rows.map(row => row.key);
  if (selected.some(key => !definitions.includes(key)))
    throw new AccessError(400, 'Capability catalog sync required');
  // Update all matching duplicates in place. Unknown/orphan metadata and IDs survive.
  await tx.query(`UPDATE role_permissions SET is_active=(permission_key=ANY($2::text[]))
    WHERE role=$1 AND permission_key=ANY($3::text[])
    AND EXISTS (SELECT 1 FROM permissions p WHERE p.key=role_permissions.permission_key)`, [role, selected, knownKeys]);
  for (const key of selected)
    await tx.query(`INSERT INTO role_permissions(role,permission_key,is_active) SELECT $1,$2,true
  WHERE NOT EXISTS (SELECT 1 FROM role_permissions WHERE role=$1 AND permission_key=$2)`, [role, key]);
}
function userView(row: Record<string, unknown>) {
  return { id: row.id, username: row.username, displayName: row.display_name || row.username, role: row.role, createdAt: row.created_at, isActive: row.active };
}
function userId(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw new AccessError(400, 'Invalid user');
  return Number(value);
}
export function createAdministration({ db, clock }: Pick<AccessDependencies, 'db' | 'clock'>) {
  async function policy<T>(verified: StaffActor, capability: PermissionKey, work: (tx: QueryClient, actor: StaffActor, now: Date) => Promise<T>, mutation = false) {
    return db.withTransaction(async (tx) => {
      if (mutation)
        await lockAccessPolicy(tx);
      const now = clock();
      const actor = await currentSession(tx, verified.id, verified.sessionId, now);
      if (!actor.permissions.includes(capability))
        throw forbidden();
      return work(tx, actor, now);
    });
  }
  async function roles(tx: QueryClient) {
    const names = (await tx.query('SELECT name FROM roles ORDER BY name')).rows;
    const result = [];
    for (const row of names) {
      const role = row.name as string;
      result.push({ role, permissionCount: role === 'admin' ? knownKeys.length : (await roleGrants(tx, role)).length });
    }
    return result;
  }
  return {
    listUsers: (actor: StaffActor) => policy(actor, 'manage_users', async (tx) => (await tx.query('SELECT id,username,display_name,role,created_at,active FROM users ORDER BY id')).rows.map(userView)),
    assignableRoles: (actor: StaffActor) => policy(actor, 'manage_users', async (tx, current) => {
      const result = [];
      for (const row of await roles(tx))
        if (current.role === 'admin' || (row.role !== 'admin' && (await roleGrants(tx, row.role)).every(key => current.permissions.includes(key))))
          result.push(row);
      return result;
    }),
    listRoles: (actor: StaffActor) => policy(actor, 'manage_roles', tx => roles(tx)),
    listPermissions: (actor: StaffActor) => policy(actor, 'manage_roles', async (tx) => (await tx.query('SELECT id,key,label,"group","order" FROM permissions WHERE key=ANY($1::text[]) ORDER BY "order",id', [knownKeys])).rows),
    getRole: (actor: StaffActor, value: unknown) => policy(actor, 'manage_roles', async (tx) => { const role = boundedText(value, 100); await requireRole(tx, role); return role === 'admin' ? knownKeys : roleGrants(tx, role); }),
    mutateRole: (actor: StaffActor, action: 'create' | 'update' | 'delete', value: unknown, body: unknown) => policy(actor, 'manage_roles', async (tx, current, now) => {
      const input = action === 'delete' ? bodyFields(body ?? {}, []) : bodyFields(body, action === 'create' ? ['role', 'permissions'] : ['permissions']);
      const role = boundedText(action === 'create' ? input.role : value, 100);
      if (role === 'admin')
        throw forbidden();
      const selected = action === 'delete' ? [] : selectedPermissions(input.permissions === undefined && action === 'create' ? [] : input.permissions);
      if (action === 'create') {
        if ((await tx.query('SELECT name FROM roles WHERE name=$1', [role])).rows[0])
          throw new AccessError(409, 'Role already exists');
        // Orphan mappings must not gain authority when recreating a deleted role.
        if (current.role !== 'admin' && (await roleGrants(tx, role)).some(key => !current.permissions.includes(key)))
          throw forbidden();
      }
      else
        await boundedRole(tx, current, role);
      if (current.role !== 'admin' && selected.some(key => !current.permissions.includes(key)))
        throw forbidden();
      const before = await roleGrants(tx, role);
      if (action === 'delete' && (await tx.query('SELECT id FROM users WHERE role=$1 LIMIT 1', [role])).rows[0])
        throw new AccessError(400, 'Role has assigned users');
      if (action === 'create')
        await tx.query('INSERT INTO roles(name) VALUES($1)', [role]);
      await writeGrants(tx, role, selected);
      if (action === 'delete')
        await tx.query('DELETE FROM roles WHERE name=$1', [role]);
      await mutationAudit(tx, current, `staff.role.${action}`, { targetRole: role, changedKeys: knownKeys.filter(key => before.includes(key) !== selected.includes(key)) }, now);
      return action === 'update' ? { success: true, role, permissions: selected } : action === 'create' ? { success: true, role } : { success: true };
    }, true),
    mutateUser: (actor: StaffActor, action: 'create' | 'update' | 'delete', value: unknown, body: unknown) => policy(actor, 'manage_users', async (tx, current, now) => {
      const input = action === 'delete' ? bodyFields(body ?? {}, []) : bodyFields(body, action === 'create' ? ['username', 'password', 'displayName', 'role'] : ['role', 'isActive', 'password', 'displayName']);
      if (action === 'update' && Object.keys(input).length === 0)
        throw new AccessError(400, 'Invalid request');
      const id = action === 'create' ? undefined : userId(value);
      const target = id === undefined ? undefined : (await tx.query('SELECT id,username,display_name,role,active FROM users WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (id !== undefined && !target)
        throw new AccessError(404, 'User not found');
      if (target)
        await boundedRole(tx, current, target.role as string);
      const role = input.role === undefined ? (target?.role as string ?? 'viewer') : boundedText(input.role, 100);
      await boundedRole(tx, current, role);
      if (input.isActive !== undefined && typeof input.isActive !== 'boolean')
        throw new AccessError(400, 'Invalid request');
      const active = input.isActive ?? target?.active ?? true;
      if (target?.role === 'admin' && target.active === true && (action === 'delete' || role !== 'admin' || active === false)) {
        if ((await tx.query("SELECT count(*)::int AS count FROM users WHERE role='admin' AND active=true")).rows[0]?.count === 1)
          throw forbidden();
      }
      if (action === 'delete' && id === current.id)
        throw new AccessError(400, 'Cannot delete own account');
      const displayName = input.displayName === undefined ? undefined : boundedText(input.displayName, 200);
      const password = input.password === undefined ? undefined : validPassword(input.password);
      let row;
      if (action === 'create') {
        const username = boundedText(input.username, 50);
        const hash = await bcrypt.hash(validPassword(input.password), 12);
        if ((await tx.query('SELECT id FROM users WHERE username=$1', [username])).rows[0])
          throw new AccessError(409, 'Username already exists');
        row = (await tx.query('INSERT INTO users(username,password_hash,display_name,role) VALUES($1,$2,$3,$4) RETURNING *', [username, hash, displayName ?? username, role])).rows[0]!;
      }
      else if (action === 'delete') {
        await tx.query('DELETE FROM users WHERE id=$1', [id]);
      }
      else {
        row = (await tx.query('UPDATE users SET role=$1,active=$2,display_name=COALESCE($3,display_name),password_hash=COALESCE($4,password_hash) WHERE id=$5 RETURNING *', [role, active, displayName ?? null, password === undefined ? null : await bcrypt.hash(password, 12), id])).rows[0]!;
        if (password !== undefined || active === false)
          await tx.query('UPDATE staff_sessions SET revoked_at=$1 WHERE user_id=$2 AND revoked_at IS NULL', [now, id]);
      }
      await mutationAudit(tx, current, `staff.user.${action}`, { targetUserId: row?.id ?? id, changedKeys: Object.keys(input).filter(key => key !== 'username') }, now);
      return action === 'delete' ? { success: true, message: 'ลบผู้ใช้สำเร็จ' } : { success: true, user: userView(row!) };
    }, true),
  };
}
