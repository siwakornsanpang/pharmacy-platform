export { fakeStorage } from '../../src/modules/media/storage';

export const mediaTableDdl = `
CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY,
  owner_domain varchar(32) NOT NULL,
  owner_type varchar(64) NOT NULL,
  owner_id varchar(128) NOT NULL,
  owner_slot varchar(64) NOT NULL,
  kind varchar(32) NOT NULL,
  visibility varchar(16) NOT NULL,
  filename varchar(255) NOT NULL,
  mime varchar(127) NOT NULL,
  byte_size bigint NOT NULL,
  object_key varchar(255) NOT NULL,
  created_at timestamp DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media_asset_pins (
  id serial PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES media_assets(id),
  owner_domain varchar(32) NOT NULL,
  owner_type varchar(64) NOT NULL,
  owner_id varchar(128) NOT NULL,
  owner_slot varchar(64) NOT NULL,
  state varchar(16) NOT NULL,
  created_at timestamp DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media_asset_references (
  id serial PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES media_assets(id),
  owner_domain varchar(32) NOT NULL,
  owner_type varchar(64) NOT NULL,
  owner_id varchar(128) NOT NULL,
  owner_slot varchar(64) NOT NULL,
  created_at timestamp DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media_cleanup_jobs (
  id serial PRIMARY KEY,
  asset_id uuid NOT NULL,
  reason varchar(64) NOT NULL,
  created_at timestamp DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media_upload_intents (
  id uuid PRIMARY KEY,
  ticket_hash varchar(64) NOT NULL UNIQUE,
  owner_domain varchar(32) NOT NULL,
  owner_type varchar(64) NOT NULL,
  owner_id varchar(128) NOT NULL,
  owner_slot varchar(64) NOT NULL,
  kind varchar(32) NOT NULL,
  filename varchar(255) NOT NULL,
  mime varchar(127) NOT NULL,
  byte_size bigint NOT NULL,
  actor_kind varchar(32) NOT NULL,
  actor_key varchar(100) NOT NULL,
  user_id varchar(32),
  session_id varchar(64),
  required_capability varchar(64),
  pharmacist_license varchar(64),
  display_name varchar(255),
  subject varchar(255),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamp DEFAULT now()
);
CREATE TABLE IF NOT EXISTS content_asset_refs (
  id serial PRIMARY KEY,
  owner_type varchar(64) NOT NULL,
  owner_id varchar(128) NOT NULL,
  owner_slot varchar(64) NOT NULL,
  asset_id uuid NOT NULL,
  created_at timestamp DEFAULT now(),
  UNIQUE (owner_type, owner_id, owner_slot, asset_id)
);
CREATE TABLE IF NOT EXISTS content_media_intents (
  id serial PRIMARY KEY,
  operation_id varchar(128) NOT NULL UNIQUE,
  owner_type varchar(64) NOT NULL,
  owner_id varchar(128) NOT NULL,
  owner_slot varchar(64) NOT NULL,
  attach_asset_ids json NOT NULL,
  release_asset_ids json NOT NULL,
  status varchar(16) NOT NULL,
  created_at timestamp DEFAULT now()
);
CREATE TABLE IF NOT EXISTS request_asset_refs (
  id serial PRIMARY KEY,
  owner_type varchar(64) NOT NULL,
  owner_id varchar(128) NOT NULL,
  owner_slot varchar(64) NOT NULL,
  asset_id varchar(64) NOT NULL,
  created_at timestamp DEFAULT now(),
  UNIQUE (owner_type, owner_id, owner_slot, asset_id)
);
CREATE TABLE IF NOT EXISTS request_media_intents (
  id serial PRIMARY KEY,
  operation_id varchar(128) NOT NULL UNIQUE,
  owner_type varchar(64) NOT NULL,
  owner_id varchar(128) NOT NULL,
  owner_slot varchar(64) NOT NULL,
  attach_asset_ids jsonb NOT NULL,
  release_asset_ids jsonb NOT NULL,
  status varchar(16) NOT NULL,
  created_at timestamp DEFAULT now()
);`

export function jpegBytes(size = 32, fill = 1): Buffer {
  const buffer = Buffer.alloc(size, fill);
  buffer[0] = 0xff; buffer[1] = 0xd8; buffer[2] = 0xff; buffer[3] = 0xe0;
  return buffer;
}

export function pngBytes(): Buffer {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(16, 2),
  ]);
}

export function pdfBytes(): Buffer {
  return Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF');
}

export function ooxmlBytes(): Buffer {
  return Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from('[Content_Types].xml word/document.xml'),
  ]);
}
