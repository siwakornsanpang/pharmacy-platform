CREATE TABLE "roles" (
  "name" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
-- Preserve every legacy role, including zero-grant users and unknown mappings.
INSERT INTO "roles" ("name")
SELECT "role" FROM "users" UNION SELECT "role" FROM "role_permissions" UNION SELECT 'viewer';
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- Frozen source-baseline catalog: future catalog additions cannot awaken legacy grants.
UPDATE "role_permissions" SET "is_active" = true
WHERE "permission_key" IN (
  'manage_home', 'manage_news', 'manage_council', 'manage_history', 'manage_agency',
  'manage_law', 'manage_web_settings', 'manage_register', 'view_dashboard', 'manage_users',
  'manage_roles', 'manage_about', 'manage_product', 'manage_service', 'manage_other_service',
  'manage_academy', 'manage_web_pharmacist', 'manage_royalcollege', 'manage_eservice', 'manage_tran'
) AND EXISTS (SELECT 1 FROM "permissions" WHERE "permissions"."key" = "role_permissions"."permission_key");
--> statement-breakpoint
CREATE TABLE "staff_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  CONSTRAINT "staff_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "access_audit" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_user_id" integer,
  "actor_username" text NOT NULL,
  "actor_role" text NOT NULL,
  "session_id" text NOT NULL,
  "action" text NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "access_audit_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);
