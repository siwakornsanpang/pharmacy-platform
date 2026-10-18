import bcrypt from 'bcryptjs';
import { capabilityCatalog, type StaffIdentity } from '@pharmacy/contracts/access';
import { AccessError } from './guards';
import type { AccessDependencies } from './service';
import { boundedText, validPassword, mutationAudit } from './administration';
import { lockAccessPolicy } from './policy-lock';
export async function createInitialAdmin(input: {
  username: string;
  password: string;
  displayName: string;
}, { db, clock }: Pick<AccessDependencies, 'db' | 'clock'>): Promise<StaffIdentity> {
  const username = boundedText(input.username, 50);
  const displayName = boundedText(input.displayName, 200);
  const password = validPassword(input.password);
  return db.withTransaction(async (tx) => {
    await lockAccessPolicy(tx);
    if ((await tx.query('SELECT id FROM users LIMIT 1')).rows[0])
      throw new AccessError(409, 'Account store is not empty');
    await tx.query("INSERT INTO roles(name) VALUES('admin') ON CONFLICT DO NOTHING");
    const row = (await tx.query("INSERT INTO users(username,password_hash,display_name,role) VALUES($1,$2,$3,'admin') RETURNING id", [username, await bcrypt.hash(password, 12), displayName])).rows[0]!;
    const identity: StaffIdentity = { id: row.id as number, username, displayName, role: 'admin', permissions: capabilityCatalog.map(item => item.key) };
    await mutationAudit(tx, { ...identity, sessionId: 'operator-bootstrap' }, 'staff.bootstrap', { targetUserId: identity.id, changedKeys: ['role', 'displayName', 'password'] }, clock());
    return identity;
  });
}
