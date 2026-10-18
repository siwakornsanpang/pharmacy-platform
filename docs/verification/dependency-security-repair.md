# Dependency security repair

Baseline: `2d0a32ded317383a2897ed340866f1a96359aad9`. This repair changes dependencies and one token-test fixture; application/UI/auth policy, database schema, source repositories and cloud resources are unchanged. It does not approve deployment.

## Changes and compatibility

- Both Next pins 16.1.6 → 16.3.8, including required env/SWC/helpers, PostCSS 8.5.23, sharp 0.35.5/native assets and baseline-browser-mapping 2.11.0. React stays 19.2.3.
- Backend Fastify 5.7.4 → 5.12.5, Drizzle ORM 0.45.1 → 0.45.2. Remove unused `@fastify/static` and its orphaned subtree after reconfirming no import/registration. Keep JWT/multipart plugins; scope fast-jwt 6.3.4, busboy 3.2.2, find-my-way 9.7.0 and fast-uri 3.1.8 to compatible paths. Fastify's new serializer also needs fast-uri 4.2.2.
- Keep isomorphic-dompurify 3.0.0-rc.2; restore its declared jsdom 28.0.0 runtime with DOMPurify 3.4.16 and undici 7.29.1. Frontend test jsdom 30.0.1 remains, with undici 8.10.2. The prerelease wrapper override uses its package name because a prerelease version selector did not apply reliably to the declared range.
- AJV 8.17.1 → 8.18.0, js-cookie 3.0.5 → 3.0.7, lodash/lodash-es 4.17.23 → 4.18.1, Supabase realtime's ws 8.19.0 → 8.21.0, brace-expansion 1.1.14/5.0.6 → 1.1.21/5.0.12, source-map-js 1.2.1 → 1.2.2. Version/parent-scoped root overrides make the selected fixes reproducible.
- The negative JWT fixture now passes explicit empty signer options. With fast-jwt 6.3.4, default configured `expiresIn` overwrote its deliberately expired `exp`, producing a valid token. Decoded-token/app probes prove the distinction; every 401 assertion remains. Production signer/verifier code is unchanged.

Primary candidate evidence: official [Next manifest](https://raw.githubusercontent.com/vercel/next.js/v16.3.8/packages/next/package.json), [fast-jwt advisory](https://github.com/nearform/fast-jwt/security/advisories/GHSA-x937-hj6v-793p), [DOMPurify advisory](https://github.com/cure53/DOMPurify/security/advisories/GHSA-6688-9rhm-gjv2), [busboy advisory](https://github.com/fastify/busboy/security/advisories/GHSA-gxm5-99cw-xjw9), [Drizzle advisory](https://github.com/drizzle-team/drizzle-orm/security/advisories/GHSA-gpj5-g38j-94v9), and exact published npm manifests/integrities retained in the local evidence directory.

## Verified results

Node 24.19.0; resolution used explicitly authorized npm 11.17.0, clean installation and checks used npm 11.6.2. Both clean full and isolated omit-dev installs used `--ignore-scripts --legacy-peer-deps`. The isolated artifact contains only copied workspace manifests/central lock and installed packages, no app source or environment files. Both installations preserved lock bytes.

- Shared builds, independent contracts and HTTP packs, boundary checker and 5 boundary tests passed; contracts 10 and HTTP 5 tests passed.
- Backend 66/66, Backoffice 66/66 and Pharmacy 45/45 tests passed; backend typecheck/build passed.
- Sequential Next type generation then typecheck passed for each frontend. Pharmacy's first typecheck hit old ignored Next-generated files; those files were preserved outside the app and regenerated before the passing check.
- Sanitizer Node require/import strip malicious HTML in both full and omit-dev artifacts, resolving nested jsdom 28/undici 7/DOMPurify 3.4.16. Native sharp 0.35.5 imports and produces/reads a 1-pixel PNG in both artifacts. No hoisted dev jsdom 30 exists in the omit-dev artifact.
- Published integrity matched 23 selected lock entries; no security override lies outside the original declaring semver range. Full lock graph also retains two unchanged optional wasm32 Tailwind edges with incompatible `@napi-rs/wasm-runtime` resolutions; both are excluded on this Darwin arm64 host. Sharp's optional Windows ia32 binary declares Node `^20.9.0`, so Node 24 portability to that platform is not established. Native target-platform release checks remain required.

Fresh lock audit: **18 entries: 0 critical, 8 high, 7 moderate, 3 low**, versus original 38/2 critical. Counts include propagated entries. All intended patched candidates clear the audit. Remaining findings comprise 3 production/mixed entries and 15 dev-only entries; this is not a zero-vulnerability claim.

## Residual ownership before release

- **Task 3 editor/write/render gate:** Quill 2.0.3 and propagated react-quill-new 3.8.3 remain. The [reporter's advisory](https://fluidattacks.com/advisories/diomedes) concerns formula/video embed values exported through `getSemanticHTML()`/`getHTML()` and rendered as HTML. The current wrapper defaults to semantic HTML, the app's full toolbar includes video, and the news preview directly renders content. A compatible `~2.0.x` patch is unavailable. Require sanitization/allowlist persistence-and-render tests before release; simple sanitizer import smoke does not close this gate.
- **Public map integration/security owner:** d3-zoom 2 → d3-interpolate 2 and d3-transition 2 → d3-color 2.0.0 require `1 - 2`; forcing fixed 3.1.0 violates those ranges. The [upstream fix](https://github.com/d3/d3-color/pull/100) addresses hostile color-string regex backtracking. Focused caller tracing shows member-map palette constants travel through d3-scale 4 → d3-interpolate 3 → already-fixed d3-color 3.1.0. Geography colors are React style props/CSS transitions; zoom's D3 tween receives numeric coordinate arrays through `interpolateZoom`, not color strings. No hostile input to the affected color parser was established in these callers. Preserve the residual; recheck actual target bundle/map interactions and any future dynamic color input before release.
- **Dev/CI tooling security owner:** retained dev-only entries are Babel core; humanfs; Browserslist; js-yaml; Next ESLint config/plugin → fast-glob/micromatch/braces; Vitest/mocker; and Drizzle Kit → old esbuild-kit/esbuild. Conditions involve hostile source-map paths, symlink-copy inputs, Browserslist queries/stats, YAML aliases, deeply nested glob patterns, mock redirect paths or development-server requests. Review compatible tool patches as a separate bounded change; isolate CI inputs/development servers until verified. Do not apply audit-suggested major downgrades or treat dev findings as deployed request exposure.

Complete target production builds, contact/API consumer conversion, target visual integration/browser sanitizer/editor/map checks, Task 3 publication coverage, release:check and deployment validation remain later owning gates. No full Next production build or approved visual baseline update was run here.

Raw audit output is not part of this repository.
