# Access intentional corrections

- Capability catalog seed and catalog-row delete are not exposed through Backoffice. Keys are declared in code and synced by the backend; the permissions screen no longer offers a seed button or permission-key deletion.
- Role create is a single atomic request of `{ role, permissions }`. A failed grant write does not show a success toast.
- Assignable roles for user creation come from `/auth/assignable-roles`. A `manage_users` actor without `manage_roles` cannot pick `admin` or a stronger role that is not in that list. There is no client fallback list of admin/editor/viewer.
- Local UI bypass is never enabled from the browser bundle. Isolated local development remains a server-only `ALLOW_LOCAL_UI_BYPASS` gate.
- JSON article/product cover uploads request a one-use intent and send the file to the media upload URL. Multipart family forms still cannot send file bytes through Next; those adapters remain later work.
