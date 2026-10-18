# Content, Registry, and Media boundaries

Owning domains keep their own tables. Cross-domain work uses typed ports, not shared SQL transactions and not delete-by-URL.

## Domain privacy

- Requests talks to Registry only through `RegistryPort.getPharmacistByLicense`. It does not import Registry schema files and does not read `pharmacists` or `citizen_id`.
- Content talks to Media only through the `../media` barrel (`MediaLifecycle`, `UploadIntentService`, `MediaError`, `parseOwner`). Content does not import Media schema, storage, cleanup, reconcile, routes, tickets, or policy files.
- Public Registry projections stay limited to the published pharmacist fields. Private identifiers stay in Registry.
- Backoffice and Pharmacy browser code do not embed `DATABASE_URL`, JWT secrets, Drizzle, `pg`, or the Supabase service key. Staff session cookies stay HttpOnly. Direct file upload uses `uploadWithIntent` with `credentials: 'omit'` and no `Authorization` header.

## Delivery

- Public, staff, and member JSON APIs send `Cache-Control: no-store`. Shared `nativeRequest` always fetches with `cache: 'no-store'`.
- A successful Content JSON write is visible on the next read. A denied write leaves the stored row unchanged.
- Next proxies JSON metadata only (`jsonMetadataMaxBytes` = 4_000_000). File bytes skip Next: the browser posts the object to `/api/media/uploads/:intentId` after a one-use ticket.
- Private download is a bodyless 302 to a signed URL. The Next staff proxy forwards the Location and does not relay object bytes.

Multipart Content families remain held. Academy stays on Plan03. This document does not claim live Render, Supabase, or Vercel policies.
