# Workspace dependency compatibility

The source pharmacy frontend uses React 19.2.3 and react-simple-maps 3.0.0 in `MembersContent.tsx`. The map package declares React peers only through React 18. Preserve both existing versions and the source override rather than changing framework majors during foundation work.

This workspace explicitly enables `legacy-peer-deps=true` in `.npmrc`; CI also passes `npm ci --legacy-peer-deps`. The merged lock retains source resolutions where compatible. Changes to map dependencies require a browser smoke check of the public members map before the final responsive UI baseline is accepted.

Use Node 24.15 or later within Node 24: the preserved jsdom 30.0.1 testing dependency requires that minimum. Verification and dependency-restoration installation use the bundled Node 24.19 runtime pinned in `.nvmrc`. Earlier foundation installs used the default Node 24.12 and produced engine warnings; the correction install used Node 24.19 and emitted no engine mismatch warnings.

Production-build verification and CI set `NEXT_PUBLIC_API_URL=http://127.0.0.1:9` so preserved server-page fallback fetches cannot reach the live public API. Google Fonts still require network access on a fresh cache. UI fallback fetch errors during an offline build are expected and are recorded separately from compiler errors.

App direct dependencies must resolve to their original source-lock versions where compatible. Backoffice sweetalert2 11.26.18, @tailwindcss/postcss and tailwindcss 4.1.18, @types/react 19.2.10, and eslint 9.39.2 are explicitly pinned; pharmacy @types/node is pinned to 20.19.37. npm generates valid nested resolutions for these app-specific versions. The correction verified all 67 original app direct dependencies against their source locks with zero differences; source UI bytes alone are not sufficient evidence when CSS tooling versions drift. The restored ESLint version emits a deprecation warning, retained under this source-version policy.

The security exception updates only Next, Fastify, Drizzle ORM, AJV, js-cookie and their reviewed security subtrees, and removes unused `@fastify/static`. Root overrides retain reviewed compatible versions; the sanitizer wrapper stays at 3.0.0-rc.2 with its own jsdom 28.0.0/undici 7.29.1 runtime, while frontend test jsdom stays 30.0.1 with undici 8.10.2. React and unrelated source pins stay unchanged. See [repair verification and remaining gates](dependency-security-repair.md).

For this repair, normal lock resolution required the already-installed npm 11.17.0 under Node 24.19: npm 11.6.2 retained stale workspace resolutions despite changed overrides. Clean `npm ci --ignore-scripts --legacy-peer-deps` with npm 11.6.2 passed against the resulting standard v3 lock, including an isolated `--omit=dev` artifact. Use the reviewed resolver when changing these overrides and inspect the resulting graph; a successful lock-only command alone does not establish the override took effect.
