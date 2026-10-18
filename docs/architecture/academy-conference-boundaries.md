# Academy and Conference boundaries

Academy is owned by this monorepo. Conference stays an external service. Pharmacy-web talks to Conference only through the Next attendee proxy. Staff JWT and admin cookies never go on that path.

## Auth surfaces

- Public Pharmacy pages render without waiting on `/api/auth/pharmacy/me`. `AuthProvider` exposes `authReady` for identity chrome only.
- Member Academy routes (`/api/academy/...` other than the public catalog) use the opaque Pharmacy session. Missing session is 401. The browser client does not send `Authorization` or `x-academy-bridge`.
- Conference proxy copies attendee cookies (`conference_attendee_session`, `conference_csrf`) only. `CONFERENCE_API_URL` is required configuration. Shared assertion JWK must be rotated with the Conference owner; this repo does not paste that key.

## Data and files

- Academy catalog GETs are public Content-style reads. Enrollment, payment mock, progress, exam, certificate, and private asset download stay member-gated.
- Academy file bytes never pass through Next. JSON upload intents plus a 302 private download.
- Conference screens in Pharmacy reuse the existing meeting UI. There is no Conference Backoffice in this repo.

## Not claimed

Live Conference authentication, live payment, and production provider behavior. The existing visual harness is the release check. There is no second Playwright config.
