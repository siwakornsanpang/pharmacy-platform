import type { CapabilityDefinition } from '@pharmacy/contracts/access';
import type { Database } from '../../db/client';

export function syncCapabilityCatalog(db: Database, catalog: readonly CapabilityDefinition[]): Promise<{ inserted: number; updated: number }> {
  return db.withTransaction(async tx => {
    const counts = { inserted: 0, updated: 0 };
    for (const definition of catalog) {
      const row = (await tx.query(`INSERT INTO permissions(key,label,"group","order") VALUES($1,$2,$3,$4)
        ON CONFLICT (key) DO UPDATE SET label=EXCLUDED.label,"group"=EXCLUDED."group","order"=EXCLUDED."order"
        WHERE (permissions.label,permissions."group",permissions."order") IS DISTINCT FROM (EXCLUDED.label,EXCLUDED."group",EXCLUDED."order")
        RETURNING (xmax=0) AS inserted`,
      [definition.key, definition.label, definition.group, definition.order])).rows[0];
      if (row) counts[row.inserted === true ? 'inserted' : 'updated']++;
    }
    return counts;
  });
}
