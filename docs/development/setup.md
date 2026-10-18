# Setup

Node 24 (`engines` and `.nvmrc` 24.19.0). From the monorepo root:

```sh
npm ci --legacy-peer-deps
npm run build:shared
npm run typecheck
```

Named test database: local `postgresql://pharmacy_test@127.0.0.1:54329/pharmacy_test_*` only. `TEST_DATABASE_URL` must not equal `DATABASE_URL`.

Bootstrap a test admin with `npm run staff:create --workspace apps/backend-api` against the disposable DB. `npm run catalog:sync --workspace apps/backend-api` is idempotent; a second run must not change grants.

Apps:

- `npm run dev --workspace apps/backend-api`
- `npm run dev --workspace apps/pharmacy-web`
- `npm run dev --workspace apps/backoffice`

Operator env names: `docs/operations/env-inventory.md`. Conference remains an external URL (`CONFERENCE_API_URL`).
