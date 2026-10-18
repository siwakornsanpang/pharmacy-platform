# Content / Registry / Media privacy evidence

These are local fixture proofs. They do not establish production cache policies.

## Domain boundaries

Focused `apps/backend-api/tests/domain-boundaries.test.ts`:

- Requests production sources import Registry only through the public barrel and contain neither `pharmacists` nor `citizen_id`.
- Content production sources import Media only through the public barrel. `parseOwner` is exported from that barrel.
- Backoffice `src` and Pharmacy application sources do not contain `DATABASE_URL`, JWT secrets, Drizzle, `pg`, or `@supabase/supabase-js`.

## No-store and write visibility

Focused `apps/backend-api/tests/data-cache-policy.test.ts` against disposable local PostgreSQL 17.11 and `fakeStorage`:

- `GET /api/news`, `GET /api/admin/content/news`, `GET /api/pharmacists/stats`, and `GET /api/admin/registry/requests` return `Cache-Control: no-store`.
- Staff JSON `POST /api/news` then `GET /api/admin/content/news/:id` returns the committed title.
- A staff actor without `manage_news` receives 403 on `PUT /api/news/:id`; the stored title is unchanged.

## 8MiB upload path

Same cache-policy fixture, plus `tests/e2e/content-registry-media.spec.ts`:

| Check | Result |
| --- | --- |
| Next JSON ceiling | `jsonMetadataMaxBytes` = 4_000_000; factory JSON over that size is 413 |
| NextFileBytes | Next `requestMetadata` rejects `application/octet-stream` (415) and does not read FormData/arrayBuffer |
| RenderBytes | Direct `POST /api/media/uploads/:intentId` of an 8,388,608-byte PDF stages `storage.uploads[0].size === 8388608` on `fakeStorage` |
| JSstaffJWT | `uploadWithIntent` sends only `x-upload-ticket` / `content-type`, `credentials: 'omit'`, `cache: 'no-store'` |
| Private download | `GET /api/media/:id/download` is 302, empty body, `Location` on `https://storage.example.test/...` |
| Live providers | Fixture never calls `supabaseStorage`; signed URL host is not `supabase.co` or `onrender.com` |

## Visual suite

`npm run test:visual -- --grep "content-registry-media"` names the frozen legacy comparison suite. That suite is not evidence about the current app.

## Not claimed

Live bucket policies, CDN cache headers, production JWT cookies, source-to-target file copy, and Plan04 migration/deploy readiness.
