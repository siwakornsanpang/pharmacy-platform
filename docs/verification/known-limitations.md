# Known limitations

- Pharmacy member login is a POC mock (numeric IDs / `ph123`, password `12345`, OTP `111222`) when `PHARMACY_POC_MODE` is enabled.
- Payments and refunds are mock auto-approve in Academy.
- Public license search, profile save, and contact form stay client mocks.
- Conference stays an external service. This repo proxies attendee cookies only.
- Category/instructor Academy images have no media slots; those file inputs fail closed.
- Staff accounts are not migrated. Fresh admin is `staff:create` after cutover.
- Visual screenshots belong to frozen legacy sources, not the target apps.
- Numeric performance percentages are not claimed; public pages no longer wait on `/me`, but TTFB was not measured on production.
