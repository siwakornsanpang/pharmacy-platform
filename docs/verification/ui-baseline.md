# Offline UI baseline

This harness freezes the final responsive original Pharmacy UI and stable legacy Backoffice separately from the evolving target apps. It never copies source environment files or private CSVs. Target UI synchronization, new session policies and content/media adapters are subsequent integration work.

Run from the repository root with the pinned repository Playwright 1.62.1 and installed Google Chrome. No command installs a browser or downloads fonts. Two isolated contexts use 1440×900 and 390×844, Thai locale, Asia/Bangkok timezone and device scale 1. The default is one worker; `--workers=2` runs the two viewport projects concurrently against stateless fixtures.

```sh
node --import tsx --test tests/e2e/harness.test.ts
npm run test:visual -- --list
UI_BASELINE_SUITE=content-registry-media npm run test:visual -- --workers=2
```

The default suite is `baseline`; `UI_BASELINE_SUITE=content-registry-media` registers the same manifest as the repeat-comparison suite. Both currently launch the frozen snapshots; actual target app parity requires the subsequent reviewed integration and its target session fixtures.

The source snapshots are `tests/fixtures/legacy-backoffice` and `tests/fixtures/legacy-pharmacy`; per-file SHA-256 manifests record their source commits and clean source status. The final Pharmacy source is `2e56e3ce063ec8831ada2487b06d11f2be60528b`; Backoffice is `99ab56563f905fe21ee7c01baeecf3f14aebd6d9`. Both originals remain read-only. The safe geographic asset exception is exactly `public/data/thailand.json`: a FeatureCollection of 77 province geometries, whose feature properties contain only `name`. No other `public/data` payload is copied.

`start-legacy.ts` validates every snapshot/asset hash, creates a fresh ignored build directory, links the existing pinned root dependencies and builds both snapshots with Webpack. Fresh output prevents stale Next font-loader/cache reuse. Its test-only configuration permits only fixture image optimization and replaces the original live proxy rewrite with loopback. An inherited Node guard blocks external fetch, HTTP(S), TCP/DNS and UDP before Next build/runtime access. Browser interception permits only the app/fixture origins and declared local substitutions; unknown requests, websocket attempts, fixture 501s, page errors or a nonempty server egress log fail the test. Fixture writes return synthetic failures and have no forwarding implementation.

The fixture origin is 127.0.0.1:4319; legacy Backoffice and Pharmacy use ports 4320 and 4321. Legacy staff cookies and a synthetic Pharmacy navigation cookie are confined to browser contexts for these frozen sources. Pharmacy `/api/auth`, Academy and Conference UI calls are locally fulfilled with synthetic identities and payloads. These fixtures do not bypass or validate target authentication.

Both server and browser dates are fixed at `2026-10-14T00:00:00Z`. Browser timers start paused; named readiness steps advance at most one second for the dynamic editor, 300+32 ms virtual frames plus completion of existing native animations for the meeting recommendation entry and 50 ms for OTP focus, below the five-second carousel interval. Captures retain initial carousel state. The harness awaits the font set, loads/checks Kanit 300/400/500/600 with Thai and Latin samples, validates each received WOFF2 hash, eagerly loads requested images and decodes them. Empty, unsourced SweetAlert image placeholders are not failed image requests. The recovered harness also exempts `/favicon.ico` decoding: the original Backoffice `src/app/favicon.ico` is a WebP payload with an ICO filename (SHA-256 `3aeb432d01bbe8a069ddb8d54764e2c2add68f9a50c76109ce01d08220962dbe`), consumed as the header logo at `src/app/backoffice/layout/Header.tsx:62`. Chrome shows the existing broken logo. This known source defect remains visible; it is not an all-images-decode success claim and requires a separately reviewed variance if corrected later.

The font manifest contains exact cached bytes and preserved CSS weight/unicode mappings: 16 Kanit faces shared by both apps, five Geist and six Geist Mono faces in Pharmacy. Every clean build asserts the complete emitted hash set (16 Backoffice, 27 Pharmacy), before opening a server. Existing Sarabun declarations have no loaded source bytes and retain the original system fallback; no new fallback font is substituted.

Remote Unsplash/placehold.co imagery, if requested, is locally fulfilled with the manifested synthetic SVG. YouTube embed requests, if requested, receive a deterministic local HTML shell. These are counted substitutions, not claims of reproducing unavailable remote content. Automatic Next RSC prefetches for source links `/register` and `/forgot-password` are locally blocked only when an RSC query and Next prefetch header positively identify them; their normal dead-link navigation behavior remains unchanged. Expected blocked prefetches are reported separately from unexpected traffic.

The manifest covers all 100 source page patterns (55 Backoffice, 45 Pharmacy), 43 friendly Pharmacy alias entries and six representative interaction states, each at both viewports. Existing source redirect pages declare their exact final destinations. Critical screenshots include public/member home, list/detail, login/OTP/navigation, registry, forms/editor/crop, mock profile save, and mutation/upload error states. License-search smoke follows a matching result to detail and back, preserves the search query, and exercises page two. Academy/Conference fixtures are synthetic compatibility fixtures; live payment, enrollment and peer services are not tested.

Interrupted preliminary screenshots are not part of the reviewed baseline. Do not overwrite reviewed screenshots with them. A later comparison must reuse the same fixtures, assets, and font hashes, and record approved differences separately.

Capture counts, browser version, and hashes are in `tests/e2e/baseline-evidence.json`. A repeat comparison of the frozen source shows the harness is stable. It does not show that the current UI matches that source.

The corrected meeting-card sample waits for the existing card animation, advances the virtual clock, and requires full opacity with an identity transform. The comparison threshold stays at zero pixels.
