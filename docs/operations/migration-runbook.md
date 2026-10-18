# Migration runbook

Fixture-only until operator config exists. Live apply needs `MIGRATION_CONFIG_FILE` outside Git and `MIGRATION_APPLY=I_CONFIRM_TARGET`.

```sh
export MIGRATION_CONFIG_FILE=/path/to/operator-config.json
npm run migration:inventory
npm run migration:plan
MIGRATION_APPLY=I_CONFIRM_TARGET npm run migration:apply -- --apply
MIGRATION_APPLY=I_CONFIRM_TARGET npm run migration:copy -- --apply
MIGRATION_WRITERS_FROZEN=true npm run migration:verify -- --apply
```

Inventory excludes `users`, `pharmacist_logins`, and `staff_sessions`. Artifact summaries store counts and hashes, not dumps. Source objects are never deleted. Conflicting target bytes fail. Rehearsal against a new isolated target is Task 4 after new project refs exist.

This runbook does not copy live Neon/Supabase bytes from this machine.
