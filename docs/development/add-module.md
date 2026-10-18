# Adding a domain module

Follow Access + contracts + feature adapters. Do not ship a dummy tab.

1. Tables and services live in `apps/backend-api/src/modules/<domain>/`. Export DTOs from `@pharmacy/contracts`.
2. Add a `CAPABILITY` constant, catalog sync, `requireCapability` on staff routes, and a negative test that a role without the grant is 403.
3. Frontends use `features/<domain>` JSON clients. Browser code does not import `getServerConfig` or `DATABASE_URL`.
4. Cross-domain work uses typed ports. No shared SQL transaction. No delete-by-URL.
5. Register Next proxy allowlist routes. Mutations need CSRF Origin. Private files stay 302.

Conference: `docs/development/add-conference-module.md`.
