# Data transformations

Business rows keep their source IDs, enums, JSON, grants, and leading-zero licenses as text. `users` / sessions / password hashes are excluded rather than remapped onto new staff.

Internal Supabase storage URLs are rewritten once to the new public object URL. YouTube and Conference URLs stay unchanged even if the path contains `uploads`. Private object identity stays an asset id, never a signed URL.

Unresolved `created_by` staff refs, extra live columns, and unknown schemas stay on `manifest.exceptions`. Restore copies no tables while exceptions exist, and cutover stays blocked.
