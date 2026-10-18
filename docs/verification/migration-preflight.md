# Migration preflight evidence

Read-only source checks and preliminary file-byte evidence. A fixture rehearsal does not prove that production data has been copied.

## Source and target

The source contains 39 public tables and 465 preliminary rows. The migration excludes all five legacy staff users and the entire credential-only `pharmacist_logins` table with 59 rows, together with legacy account sequences and sessions. The 37 eligible business/configuration tables contain 401 preliminary rows. Preserve role definitions and grant history, including duplicate/dormant grants and zero-grant roles; initial legacy activation uses the frozen original capability set, not future capabilities.

The source catalog matches all 38 baseline table declarations, with two additional nullable text columns on `pharmacists`: `prefix` and `citizen_id`. Both must be preserved without casting or truncation in the Registry-owned portion of unreleased migration 0009. The private identifier and full address must never enter the public license projection. A foreign-key name difference on `other_service_items.category_id` has equivalent semantics and needs explicit mapping verification. No visible source Drizzle history was found; matching files do not prove applied migration history.

Source PostgreSQL is 18.6. The new Supabase project `eikmicgaatdadpdcvlxw` in Singapore and the isolated local rehearsal server are 17.11. The target connection was verified with certificate and hostname validation using the official Supabase CA. Runtime deployment must retain this verification; no TLS bypass is permitted. Secrets stay outside Git in the restricted operator file.

At the recorded target preflight, there were no public application tables, Drizzle history, or Storage buckets. Storage server-key authorization was verified through read-only bucket listing. This does not prove future bucket policies, application privileges, or migrated data integrity.

## Files and capacity

The accessible source bucket inventory contains 419 objects, with 637,713,950 metadata bytes. The largest object is 31,271,208 bytes; none exceeds 50,000,000 bytes. This supports compatibility with the selected Free-tier file ceiling, while actual target capacity, configured limits, and copying still require verification. The 100 MiB application default must not be advertised as an available provider limit.

An earlier read streamed 419 objects / 637,713,950 bytes and matched recorded sizes and SHA-256 values. Object names, contents, and credentials stay outside Git. That read is not a final backup.

This is an unfrozen preliminary read, not a final backup or target-copy reconciliation. Metadata equality cannot exclude transient or metadata-preserving source changes. The final frozen inventory, target copy, reference classification, hashes and restore checks remain required. Keep original systems unchanged until reconciliation and the cutover/rollback procedure have been verified.

## Required rehearsal

- Use the installed 18.6 exporter/archive reader for the 18.6 source. Inspect exact table and owned-business-sequence allowlists and archive contents; do not restore source DDL over Supabase-managed schemas or canonical target migrations.
- Rehearse on reviewed source-shaped 17.11 staging, including the two roster columns, then transform data into the canonical reviewed 0000–0010 target schema. Loading an 18.x archive into 17.x is not assumed compatible. Every compatibility change needs explicit mapping and fail-fast verification.
- Preserve each eligible sequence's `last_value` and `is_called`; sequence changes do not roll back with an ordinary transaction. Verify state after failures as well as successful imports.
- Verify business IDs, normalized row hashes, constraints, role/grant preservation, private/public projections, actual file hashes, reference rewrites and target policies. Freeze writers for the final inventory and reconciliation. A fixture rehearsal does not establish cloud-policy correctness.
- Do not apply the target schema until the complete owned migrations 0009/0010 and the import/tooling have passed their reviews.

## Deployment access

The repository is `siwakornsanpang/pharmacy-platform`. Seeing it in a provider picker does not mean the app is configured or healthy.

Frontend builds need `npm run build:shared` before the selected workspace build.
