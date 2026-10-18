export const managedSchemas = [
  "auth",
  "storage",
  "realtime",
  "supabase_functions",
  "vault",
  "extensions",
] as const;

export const excludedRowTables = ["users", "pharmacist_logins", "staff_sessions"] as const;
export const excludedSequences = ["users_id_seq", "pharmacist_logins_id_seq"] as const;

export const allowedExtraColumns: Record<string, readonly string[]> = {
  pharmacists: ["prefix", "citizen_id"],
};

export const staffRefColumns: Record<string, readonly string[]> = {
  news: ["created_by"],
  honors: ["created_by"],
  access_audit: ["actor_user_id"],
};

export const approvedColumns: Record<string, readonly string[]> = {
  agencies: ["id", "name", "order"],
  news: ["id", "title", "created_by"],
  pharmacists: ["id", "license_no", "prefix", "citizen_id"],
  permissions: ["key", "label"],
  roles: ["name"],
  role_permissions: ["role", "permission_key"],
  users: ["id", "username", "display_name", "role", "active"],
  staff_sessions: ["id", "user_id", "created_at", "expires_at", "revoked_at"],
};

export function isManagedSchema(schema: string) {
  return (managedSchemas as readonly string[]).includes(schema);
}
