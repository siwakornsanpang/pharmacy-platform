# Data ownership

| Domain | Owns | Talks through |
| --- | --- | --- |
| Access | `users`, `roles`, `role_permissions`, `permissions`, `staff_sessions`, `access_audit` | JWT/session helpers |
| Content | news, pages, settings, honors, laws, products, services | Media barrel only |
| Registry | `pharmacists` including `prefix` / `citizen_id` | public projection without private identifiers |
| Requests | request rows, payments, shipping | `RegistryPort.getPharmacistByLicense` |
| Media | objects, pins, tickets, `*_asset_refs` | owner/type/slot catalog |
| Academy | `academy_*`, `academy_commands`, intents | Media upload/download ports |
| Conference | external service | Next attendee proxy |

Feature modules do not import another domain's schema files. Migration tooling is outside runtime APIs.
