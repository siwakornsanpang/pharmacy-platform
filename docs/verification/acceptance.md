# Acceptance

## Fixture-passed (this workspace)

- Typecheck of contracts, http, backend, backoffice, pharmacy-web
- Focused Access/Content/Media/Academy tests against disposable Postgres 17.11
- Public auth independent of `/me` (pharmacy-web `tests/ui`)
- Migration inventory/restore/copy/reconcile/cutover on `pharmacy_test_*` + fake storage
- Deployment preflight rejects old backend, wildcards, POC bypass, public private-JWK, cache callbacks

## Not passed / not run here

- Root `test:visual` against frozen 1440×900 / 390×844 legacy servers (listed, not executed for this handoff)
- Live `/health` and `/ready` on Render
- 8MiB ticket upload to a real bucket
- New Vercel/Render/Supabase project create
- Conference authenticated live smoke after JWK rotation
- Source Neon dump and production writer freeze

A failed required live check blocks a completed-POC claim.
