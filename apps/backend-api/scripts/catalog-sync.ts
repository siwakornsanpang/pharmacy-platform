import { capabilityCatalog } from '@pharmacy/contracts/access';
import { createDatabase } from '../src/db/client';
import { syncCapabilityCatalog } from '../src/modules/access/catalog';

async function main() {
  try {
    // Operator credentials are explicit and independent of runtime configuration.
    const value = process.env.MIGRATION_DATABASE_URL?.trim();
    if (!value) throw new Error('Missing migration database URL');
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username ||
      !/^\/[^/]+$/.test(url.pathname) || !decodeURIComponent(url.pathname.slice(1)).trim() || url.hash) {
      throw new Error('Invalid migration database URL');
    }
    const db = createDatabase(value);
    let counts;
    try { counts = await syncCapabilityCatalog(db, capabilityCatalog); }
    finally { await db.close(); }
    console.log(`Capability catalog synced: inserted=${counts.inserted} updated=${counts.updated}`);
  } catch {
    console.error('Capability catalog sync failed');
    process.exitCode = 1;
  }
}

void main();
