# Application environment

Use Node 24.19.0 (`.nvmrc`) and the root npm workspace. Each app's `.env.example` contains placeholders only. Configure development, preview, and POC separately; provide real secrets through the deployment secret manager. Missing or invalid required values throw errors naming the field, without its value. Config access is lazy; importing the app factory does not read environment, connect, listen, or seed.

Backend `getServerConfig()` requires `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `STAFF_SESSION_TTL_SECONDS`, `CORS_ORIGINS`, `ACADEMY_BRIDGE_KEY`, and `PUBLIC_UPLOAD_BASE_URL`. `JWT_SECRET` must contain at least 32 characters. `DATABASE_URL` is the restricted runtime principal. Supply `MIGRATION_DATABASE_URL` only to the operator migration/setup CLI; it is neither required nor returned by runtime config. Do not give the runtime principal migration privileges.

`CORS_ORIGINS` is a comma-separated list of exact application origins. Wildcards, credentials, paths, query strings, fragments, and deployed loopback origins are rejected. HTTP is allowed only for loopback development URLs. No automatic localhost exception exists in CORS. `PUBLIC_UPLOAD_BASE_URL` is a fixed HTTPS Render upload origin with no path, query, fragment, or credentials; use the configured custom domain if applicable.

Defaults are `PORT=8080`, `UPLOAD_MAX_BYTES=104857600` (100 MiB), `UPLOAD_SNIFF_BYTES=65536` (64 KiB), and `PRIVATE_ASSET_TTL_SECONDS=300`. Limits and TTLs must be positive safe integers; sniff size cannot exceed upload size. Upload bytes go directly to the fixed backend receiver, not through the Next metadata proxy.

Both frontend server config modules are marked `server-only` and require `BACKEND_API_URL` plus their own `BACKOFFICE_ORIGIN` or `PHARMACY_WEB_ORIGIN`. These are absolute origins, without silent production or legacy-host fallback. Never expose credentials or these server transport values through `NEXT_PUBLIC_*`.

Backoffice staff UI bypass requires all of: `NODE_ENV=development`, loopback backend and Backoffice origins, `ALLOW_LOCAL_UI_BYPASS=true`, and `ISOLATED_LOCAL_MODE=true`. Otherwise requesting bypass fails closed. Preview/production cannot enable it. It is never a Pharmacy authorization exemption; pharmacy config rejects it.

The Next JSON metadata body limit is `jsonMetadataMaxBytes=4000000` bytes. The metadata proxy enforces that limit while reading the body, including an absent or misleading Content-Length, returns 413 before an upstream call, and rejects multipart file bodies.

Pharmacy's Conference assertion/private key and mock-auth/sealed-session settings remain separate integration concerns. Examples document legacy names plus the separate `PHARMACY_SESSION_SECRET`; the owning integration must validate these lazily and fail closed at the relevant bridge. Base public data config does not require Conference signing material. Keep the Pharmacy session secret distinct from the Conference assertion key. Existing legacy Conference code is not refactored here, and examples do not certify it as production-ready.

`buildApp` registers access, content, registry, requests, media, and academy, plus `/health` and `/ready`. `/health` reports process liveness. `/ready` checks the database ping, Drizzle migration hashes through `0009`, and the access, media, content-asset, and request-asset tables. A missing schema returns 503. Academy migration `0010` is outside this gate.

`buildApp({config, db, clock})` accepts explicit dependencies. The app closes only a database it creates; callers close injected databases. The client constructs its pool on first query/transaction and transactions use one checked-out connection with rollback and release. `server.ts` owns listening and signal shutdown, and logs sanitized startup/shutdown messages.

Run `npm test` and `npm run typecheck` at the root. Frontend config tests mock only the `server-only` environment marker; each app owns its own tests. New foundation tests use injected query-only fixtures and fake pool clients without network. Inherited Pharmacy assertion/exchange tests receive freshly generated in-memory Ed25519 keys from test setup; private fixture values are never logged or written. No committed/supplied signing key is used. Real SQL tests must use an explicitly supplied, guarded `TEST_DATABASE_URL` restricted to localhost and `pharmacy_test_*`; never fall back to `DATABASE_URL`.
