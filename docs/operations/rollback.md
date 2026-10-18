# Rollback

Before new writes: keep the new DB unused and restore previous app routes. After new writes: keep the new database and revert only the app release if a compatible build exists. Do not replay the old source over new rows. Do not blanket-delete target objects.

Restore rehearsal compares counts and SHA-256 on a disposable `pharmacy_test_*` database, not by resetting production.
