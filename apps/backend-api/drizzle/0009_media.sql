CREATE TABLE "content_asset_refs" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_type" varchar(64) NOT NULL,
	"owner_id" varchar(128) NOT NULL,
	"owner_slot" varchar(64) NOT NULL,
	"asset_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "content_asset_refs_owner_asset" UNIQUE("owner_type","owner_id","owner_slot","asset_id")
);

--> statement-breakpoint
CREATE TABLE "content_media_intents" (
	"id" serial PRIMARY KEY NOT NULL,
	"operation_id" varchar(128) NOT NULL,
	"owner_type" varchar(64) NOT NULL,
	"owner_id" varchar(128) NOT NULL,
	"owner_slot" varchar(64) NOT NULL,
	"attach_asset_ids" json NOT NULL,
	"release_asset_ids" json NOT NULL,
	"status" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "content_media_intents_operation_id_unique" UNIQUE("operation_id")
);

--> statement-breakpoint
CREATE TABLE "media_asset_pins" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"owner_domain" varchar(32) NOT NULL,
	"owner_type" varchar(64) NOT NULL,
	"owner_id" varchar(128) NOT NULL,
	"owner_slot" varchar(64) NOT NULL,
	"state" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now()
);

--> statement-breakpoint
CREATE TABLE "media_asset_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"owner_domain" varchar(32) NOT NULL,
	"owner_type" varchar(64) NOT NULL,
	"owner_id" varchar(128) NOT NULL,
	"owner_slot" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now()
);

--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_domain" varchar(32) NOT NULL,
	"owner_type" varchar(64) NOT NULL,
	"owner_id" varchar(128) NOT NULL,
	"owner_slot" varchar(64) NOT NULL,
	"kind" varchar(32) NOT NULL,
	"visibility" varchar(16) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"mime" varchar(127) NOT NULL,
	"byte_size" bigint NOT NULL,
	"object_key" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);

--> statement-breakpoint
CREATE TABLE "media_cleanup_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"reason" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now()
);

--> statement-breakpoint
CREATE TABLE "media_upload_intents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_hash" varchar(64) NOT NULL,
	"owner_domain" varchar(32) NOT NULL,
	"owner_type" varchar(64) NOT NULL,
	"owner_id" varchar(128) NOT NULL,
	"owner_slot" varchar(64) NOT NULL,
	"kind" varchar(32) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"mime" varchar(127) NOT NULL,
	"byte_size" bigint NOT NULL,
	"actor_kind" varchar(32) NOT NULL,
	"actor_key" varchar(100) NOT NULL,
	"user_id" varchar(32),
	"session_id" varchar(64),
	"required_capability" varchar(64),
	"pharmacist_license" varchar(64),
	"display_name" varchar(255),
	"subject" varchar(255),
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "media_upload_intents_ticket_hash_unique" UNIQUE("ticket_hash")
);

--> statement-breakpoint
CREATE TABLE "request_asset_refs" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_type" varchar(64) NOT NULL,
	"owner_id" varchar(128) NOT NULL,
	"owner_slot" varchar(64) NOT NULL,
	"asset_id" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "request_asset_refs_owner_asset" UNIQUE("owner_type","owner_id","owner_slot","asset_id")
);

--> statement-breakpoint
CREATE TABLE "request_media_intents" (
	"id" serial PRIMARY KEY NOT NULL,
	"operation_id" varchar(128) NOT NULL,
	"owner_type" varchar(64) NOT NULL,
	"owner_id" varchar(128) NOT NULL,
	"owner_slot" varchar(64) NOT NULL,
	"attach_asset_ids" jsonb NOT NULL,
	"release_asset_ids" jsonb NOT NULL,
	"status" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "request_media_intents_operation_id_unique" UNIQUE("operation_id")
);

--> statement-breakpoint
CREATE TABLE "request_operation_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_key" varchar(100) NOT NULL,
	"method" varchar(10) NOT NULL,
	"route" varchar(255) NOT NULL,
	"key" varchar(128) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"result" jsonb,
	"status" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "request_operation_keys_authority_key" UNIQUE("actor_key","method","route","key")
);

--> statement-breakpoint
ALTER TABLE "home_content" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "pharmacist_home_content" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "media_asset_pins" ADD CONSTRAINT "media_asset_pins_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "media_asset_references" ADD CONSTRAINT "media_asset_references_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;
