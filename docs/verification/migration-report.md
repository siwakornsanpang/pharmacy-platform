# Migration verification

Disposable local PostgreSQL 17.11 (`pharmacy_test_*`) and in-memory fake storage. No live database or storage apply is claimed here.

## Tooling

`npm run test:migration -- tools/migration/tests/inventory.test.ts tools/migration/tests/references.test.ts tools/migration/tests/restore.test.ts tools/migration/tests/storage.test.ts tools/migration/tests/reconcile.test.ts tools/migration/tests/cutover.test.ts`

Expected local results: roles without `password_hash`, license `00000` as text, internal storage URL rewritten once, YouTube/Conference URLs unchanged, users rows = 0 on target, copy resume skips matching objects, tamper/missing/conflict fail, sequence collision fails reconcile, cutover blocked unless frozen and passed.

## Exclusions

`users`, `pharmacist_logins`, `staff_sessions`, and those id sequences. Role names including `zero_grant_role` are configuration, not imported passwords.

## Not done

Live inventory of the current source, object byte copy to a new bucket, new GitHub/Vercel/Render/Supabase project creation, writer freeze on production, and Conference JWK rotation with the peer owner.
