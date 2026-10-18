# Per-app env inventory

Values are names only. Do not paste secrets into Git or chat.

## backend-api (Render)

`DATABASE_URL`, `MIGRATION_DATABASE_URL` (optional), `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET` (≥32), `JWT_ISSUER`, `JWT_AUDIENCE`, `STAFF_SESSION_TTL_SECONDS` (28800), `CORS_ORIGINS` (https origins, no wildcards), `ACADEMY_BRIDGE_KEY`, `PUBLIC_UPLOAD_BASE_URL` (https origin, no path), `UPLOAD_MAX_BYTES`, `PRIVATE_ASSET_TTL_SECONDS` (300), `CONTENT_IMAGE_SOURCES`, `PORT`.

## pharmacy-web (Vercel)

`BACKEND_API_URL`, `PHARMACY_WEB_ORIGIN`, `CONFERENCE_API_URL`, `PHARMACY_SESSION_SECRET` (≥32), `ACADEMY_BRIDGE_KEY` (≥16). Production mock login needs `PHARMACY_POC_MODE=true` only in an isolated POC; preflight treats that flag as not-ready for a public release.

## backoffice (Vercel)

`BACKEND_API_URL`, `BACKOFFICE_ORIGIN`. `ALLOW_LOCAL_UI_BYPASS` stays false outside isolated local mode.

Absent from this release: `CONTENT_REVALIDATION_SECRET`, cache callback URLs, staff JWT in the browser, Conference private JWK in `NEXT_PUBLIC_*`.
