# Staff setup

Use Node 24.19 and the backend workspace. Apply the owned migrations with the separate operator migration credential. Runtime startup never migrates or creates staff.

The operator must explicitly supply `MIGRATION_DATABASE_URL`; no runtime database URL fallback or JWT/storage settings are needed. Run the separate `catalog:sync` command to review/update known capability definitions. It never activates grants or changes admin policy.

From an interactive terminal, run `npm run staff:create --workspace apps/backend-api -- --username YOUR_USERNAME --display-name YOUR_NAME`. The command asks for a hidden password. Passwords require at least 12 characters and at most 72 UTF-8 bytes; no default, password argument, environment password, or piped input is accepted. Cancellation restores terminal mode. Public failure output hides connection details and credentials.

Bootstrap succeeds only while the account store is empty. Do not execute it against a live environment during local verification. The command does not overwrite grants. Subsequent accounts use authenticated user administration.

All Access policy mutations and bootstrap acquire PostgreSQL transaction advisory lock `(20261014,5)` before checking current actor/session/grants or target state. Logout takes the same lock before user/session rows. Login takes only its user row lock, so its password comparison and session insert serialize with password/disable changes without globally serializing unrelated logins. It never takes the policy lock after that row lock. Every writer must preserve this order. Mutations and their safe audit metadata commit together. The last active admin cannot be deleted, disabled, or demoted. Only a current exact `admin` account manages admin users; reserved admin grants and role definition remain read-only.

Delegates manage ordinary roles/users only within their current recognized active grant set, including both current and proposed target roles and password resets. `/api/auth/assignable-roles` requires `manage_users` independently of `manage_roles`. Password resets and disabling revoke all target sessions; re-enabling does not revive tokens.

Role selections explicitly activate known matching mappings and deactivate deselected known mappings. Existing mapping IDs, duplicates, and inert unknown/orphan metadata survive. Missing definitions require controlled catalog sync. There are no public seed, bootstrap, or permission-definition write endpoints.
