# Service extraction

The POC is one backend and two Next apps. Extracting a domain later copies its module, contracts, and feature adapters, then points env origins at the new host. Do not split Conference into a fourth standalone product in this release.

Historical Axios/Railway Conference docs describe the legacy attendee API. Current pharmacy-web uses `fetch` through `/api/conference` and `CONFERENCE_API_URL`. The future internal module lands in all three apps as in `docs/development/add-conference-module.md`.
