# Media ownership

Media stores object bytes and pin/reference metadata. Owning domains keep their own business rows and `*_media_intents` / `*_asset_refs`. There is no cross-domain SQL transaction and no delete-by-URL.

## Attach sequence

1. Direct upload stages bytes and a pending pin for a verified owner/kind/slot.
2. `reserveAttach` locks the asset and keeps a pending pin. A deleting pin is `409`.
3. The owner commits its reference row and durable intent.
4. `confirmAttach` writes Media references and marks pins confirmed. Failure enqueues a retry and leaves both old and new objects.
5. `release` drops the owner's confirmed ref/pin. Shared remaining refs or pending pins retain bytes. Last-ref cleanup marks `deleting` and then deletes storage.

Pending pins never expire into deletion. `reconcileMedia` may delete only during a dry-run-then-frozen-writer pass. If an owner lookup fails, bytes are retained.

## Canonical slots

Content uses the finite `ownerSlotCatalog` in Media policy. News/medicine/public-project use `cover`/`body`/`draft`; products use `image`/`draft`; banners, originals, PDFs, and directory images are listed there. Unknown type/slot is 400. Registry photos stay read-only. Academy uploads stay fail-closed until Plan03. JSON article writes persist fields and optional asset IDs; they never delete by URL. Multipart families remain held.

Browser clients may send asset IDs. They cannot move another actor's pin or invent owner authority.
