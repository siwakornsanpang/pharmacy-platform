# Deployment

Two new Vercel projects (`apps/pharmacy-web`, `apps/backoffice`) and one Render web service (`apps/backend-api`). Node major is 24; Vercel manages its own patch. Build shared packages first.

```
cd ../.. && npm run build:shared && npm run build --workspace apps/<app>
```

Render start: `npm run start --workspace apps/backend-api` on `0.0.0.0` / `PORT`. Health `/health`, ready `/ready`.

Secrets stay in provider env, never `NEXT_PUBLIC_*`. No `CONTENT_REVALIDATION_SECRET`. Production `PHARMACY_POC_MODE` must not be `true`. Rotate shared Conference material with the Conference owner before an authenticated live check.

`DEPLOYMENT_CONFIG_FILE` + `npm run deployment:preflight` writes no provider resources. Creating GitHub/Vercel/Render/Supabase projects requires owner login.
