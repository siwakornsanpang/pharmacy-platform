# Migration inputs

Inventory and later apply steps read `MIGRATION_CONFIG_FILE`. The file stays outside Git. CLI arguments never take database passwords.

Required keys:

- `sourceDb` / `targetDb` — PostgreSQL URLs. They must differ. Fixture tests only allow `127.0.0.1` `pharmacy_test_*` databases.
- `sourceStorage` / `targetStorage` — storage adapter ids. Live credentials stay in the operator file.
- `artifactDir` — owner-only directory outside the tracked tree (`/.migration-artifacts/` is the in-repo exception). Summaries record counts and hashes, not dumps.
- `expectedTargetProjectRef` — the new Supabase project ref. Missing config does not fall back to localhost or production.

Excluded from row export: `users`, `pharmacist_logins`, `staff_sessions`, and their id sequences. Role names are collected without `password_hash`. Leading-zero licenses stay text.

`tsx tools/migration/cli.ts inventory|plan` is dry-run until an explicit later apply confirmation.
