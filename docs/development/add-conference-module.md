# Adding an internal Conference module

Conference stays an external compatibility boundary in this refactor. Do not invent a new staff SSO against Railway, empty schema, dummy tab, or plugin loader.

When Conference becomes an internal module, land these in the same PR:

- `apps/backend-api/src/modules/conference/` owns schema, routes, and services. Public DTOs export from `@pharmacy/contracts/conference`.
- Staff uses the current Access actor (`requireCapability`) plus a catalog constant, menu, API guard, and negative tests. Run capability catalog sync before the feature ships.
- Frontends keep `features/conference` in pharmacy-web and, if needed later, backoffice. Transport is registered allowlist routes only.
- Exchange remains a verified Pharmacy session handler. Do not accept staff JWT, browser-supplied destination URLs, or Conference private keys in the client bundle.
- Known shared signing material from the legacy Conference JWK must be rotated with the Conference owner before the new deploy. Passing local fixtures is not that coordination.

Until that PR exists, pharmacy-web talks to the current Conference API through `/api/conference` using `CONFERENCE_API_URL` from `getServerConfig()`, attendee cookies only, 60s assertions, and no-store responses.
