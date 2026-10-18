# Public auth rendering evidence

Local fixture proofs only. No production latency claim.

## Before

`AuthProvider` returned `null` until `/api/auth/pharmacy/me` settled. Public header, footer, and page children waited on that identity call.

## After

Focused `apps/pharmacy-web/tests/ui/auth-provider.test.tsx` and `tests/ui/route-preservation.test.tsx`:

| Check | Result |
| --- | --- |
| Unresolved `/me` | Public children are visible; login and member greeting stay hidden until `authReady` |
| Hung `/me` | 10s abort settles `authReady` as logged out; public content stays mounted |
| Stale cookie | `PHARMACY_SESSION_INVALID` + `sessionCleared` reloads once |
| Member API | `GET /api/academy/enrollments` without a session is 401 |
| Mock profile / contact / e-Service | No network save or contact mutation; license search and SAP.33 rows stay mock fixtures |

Commands:

```sh
npm run test --workspace apps/pharmacy-web -- tests/ui/auth-provider.test.tsx tests/ui/route-preservation.test.tsx
node --import tsx --test tests/e2e/academy-conference.spec.ts tests/e2e/harness.test.ts
```

## Visual harness

`tests/e2e/route-inventory.json` now includes `public-auth` and `mock-login` pharmacy cases (`captureScreenshot: false`) plus existing Academy/Conference routes. Grep contract:

`npm run test:visual -- --list --grep "academy|conference|public-auth|mock-login"` lists the visual cases. A Playwright run against the frozen legacy servers is not a measurement of the current app's public TTFB. Numeric speed targets stay unset until a current-app baseline is captured.

## Bundles

Pharmacy `features/member` does not import `getServerConfig`. Public search/profile/contact remain mocks. Content and registry public reads continue through `/api/backend` and `/content`.

## Not claimed

Percent faster public paint, live Academy query counts, production bundle sizes, or visual parity of the target app against legacy screenshots.
