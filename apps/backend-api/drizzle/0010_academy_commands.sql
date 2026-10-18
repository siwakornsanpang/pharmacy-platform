CREATE TABLE "academy_asset_refs" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_type" varchar(64) NOT NULL,
	"owner_id" varchar(128) NOT NULL,
	"owner_slot" varchar(64) NOT NULL,
	"asset_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "academy_asset_refs_owner_asset" UNIQUE("owner_type","owner_id","owner_slot","asset_id")
);

--> statement-breakpoint
CREATE TABLE "academy_commands" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_kind" varchar(32) NOT NULL,
	"actor_id" varchar(128) NOT NULL,
	"operation" varchar(64) NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"result" jsonb,
	"status" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "academy_commands_actor_operation_key" UNIQUE("actor_kind","actor_id","operation","idempotency_key")
);

--> statement-breakpoint
CREATE TABLE "academy_media_intents" (
	"id" serial PRIMARY KEY NOT NULL,
	"operation_id" varchar(128) NOT NULL,
	"owner_type" varchar(64) NOT NULL,
	"owner_id" varchar(128) NOT NULL,
	"owner_slot" varchar(64) NOT NULL,
	"attach_asset_ids" json NOT NULL,
	"release_asset_ids" json NOT NULL,
	"status" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "academy_media_intents_operation_id_unique" UNIQUE("operation_id")
);
